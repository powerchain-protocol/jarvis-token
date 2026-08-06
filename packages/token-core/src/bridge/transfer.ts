import { z } from "zod";
import { bridgeConfigSchema, type BridgeConfig } from "./config.js";

const uintString = z.string().regex(/^\d+$/);
const createTransferSchema = z.object({
  transferId: z.string().min(16), messageDigest: z.string().min(32),
  direction: z.enum(["sui-to-solana", "solana-to-sui"]), amountBaseUnits: uintString,
  sender: z.string().min(3), recipient: z.string().min(3), sourceTransaction: z.string().min(16),
  startedAt: z.iso.datetime(),
});

export type TransferDirection = z.infer<typeof createTransferSchema>["direction"];
export type TransferStatus = "pending-attestations" | "ready-to-redeem" | "completed" | "manual-review";

export interface BridgeAttestation {
  transceiver: string;
  attestationId: string;
  observedAt: string;
}

export interface BridgeTransferRecord {
  transferId: string;
  messageDigest: string;
  direction: TransferDirection;
  amountBaseUnits: string;
  sender: string;
  recipient: string;
  sourceTransaction: string;
  sourceAction: "lock" | "burn";
  destinationAction: "mint" | "release";
  startedAt: string;
  threshold: number;
  allowedTransceivers: string[];
  attestations: BridgeAttestation[];
  status: TransferStatus;
  destinationTransaction?: string;
  completedAt?: string;
  reviewReason?: string;
}

function requireActive(record: BridgeTransferRecord): void {
  if (record.status === "completed" || record.status === "manual-review") {
    throw new Error(`transfer ${record.transferId} is terminal: ${record.status}`);
  }
}

/** Creates an inert tracking record after pause, replay, amount, and rate-limit checks. */
export function createBridgeTransfer(
  input: unknown,
  configInput: BridgeConfig | unknown,
  existingTransfers: Iterable<string | Pick<BridgeTransferRecord, "transferId" | "messageDigest">> = [],
  outboundUsedBaseUnits = "0",
): BridgeTransferRecord {
  const transfer = createTransferSchema.parse(input);
  const config = bridgeConfigSchema.parse(configInput);
  if (config.paused) throw new Error("bridge is paused");
  for (const existing of existingTransfers) {
    if (typeof existing === "string") {
      if (existing === transfer.transferId) throw new Error("duplicate transfer ID");
    } else {
      if (existing.transferId === transfer.transferId) throw new Error("duplicate transfer ID");
      if (existing.messageDigest === transfer.messageDigest) throw new Error("duplicate message digest");
    }
  }
  const amount = BigInt(transfer.amountBaseUnits);
  const used = BigInt(uintString.parse(outboundUsedBaseUnits));
  if (amount === 0n) throw new Error("transfer amount must be positive");
  const limit = BigInt(transfer.direction === "sui-to-solana"
    ? config.limits.suiOutboundBaseUnits : config.limits.solanaOutboundBaseUnits);
  if (used > limit) throw new Error("observed outbound usage already exceeds the configured limit");
  if (amount + used > limit) throw new Error("transfer exceeds remaining outbound window capacity");
  const suiToSolana = transfer.direction === "sui-to-solana";
  return {
    ...transfer,
    sourceAction: suiToSolana ? "lock" : "burn",
    destinationAction: suiToSolana ? "mint" : "release",
    threshold: config.threshold,
    allowedTransceivers: [...config.transceivers],
    attestations: [],
    status: "pending-attestations",
  };
}

/** Records one unique transceiver attestation for the exact transfer digest. */
export function recordBridgeAttestation(
  record: BridgeTransferRecord,
  input: { transceiver: string; messageDigest: string; attestationId: string; observedAt: string },
): BridgeTransferRecord {
  requireActive(record);
  if (record.status !== "pending-attestations") throw new Error("attestation threshold already reached");
  if (input.transceiver.length < 3) throw new Error("invalid transceiver identity");
  if (!record.allowedTransceivers.includes(input.transceiver)) throw new Error("unregistered transceiver");
  if (input.messageDigest !== record.messageDigest) throw new Error("attestation digest mismatch");
  if (input.attestationId.length < 16) throw new Error("invalid attestation ID");
  z.iso.datetime().parse(input.observedAt);
  if (Date.parse(input.observedAt) < Date.parse(record.startedAt)) throw new Error("attestation predates transfer");
  if (record.attestations.some((item) => item.transceiver === input.transceiver)) throw new Error("duplicate transceiver attestation");
  if (record.attestations.some((item) => item.attestationId === input.attestationId)) throw new Error("duplicate attestation ID");
  const attestations = [...record.attestations, { transceiver: input.transceiver, attestationId: input.attestationId, observedAt: input.observedAt }];
  return {
    ...record,
    attestations,
    status: attestations.length >= record.threshold ? "ready-to-redeem" : "pending-attestations",
  };
}

/** Marks redemption complete only after the configured unique-attestation threshold. */
export function completeBridgeTransfer(
  record: BridgeTransferRecord,
  destinationTransaction: string,
  completedAt: string,
): BridgeTransferRecord {
  requireActive(record);
  if (record.status !== "ready-to-redeem") throw new Error("transfer is not ready to redeem");
  if (destinationTransaction.length < 16) throw new Error("invalid destination transaction");
  z.iso.datetime().parse(completedAt);
  const latestAttestation = Math.max(...record.attestations.map((item) => Date.parse(item.observedAt)));
  if (Date.parse(completedAt) < latestAttestation) throw new Error("completion predates attestation threshold");
  return { ...record, status: "completed", destinationTransaction, completedAt };
}

/** Quarantines a transfer without pretending that locked/burned value was cancelled. */
export function markBridgeTransferForManualReview(
  record: BridgeTransferRecord,
  reason: string,
): BridgeTransferRecord {
  requireActive(record);
  if (reason.trim().length < 8) throw new Error("manual-review reason is too short");
  return { ...record, status: "manual-review", reviewReason: reason.trim() };
}

/** Aggregates unsettled value for the global supply snapshot. */
export function calculateInFlightBaseUnits(records: Iterable<BridgeTransferRecord>) {
  let suiToSolana = 0n;
  let solanaToSui = 0n;
  const transferIds = new Set<string>();
  const messageDigests = new Set<string>();
  for (const record of records) {
    if (transferIds.has(record.transferId)) throw new Error("duplicate transfer ID in aggregation");
    if (messageDigests.has(record.messageDigest)) throw new Error("duplicate message digest in aggregation");
    transferIds.add(record.transferId);
    messageDigests.add(record.messageDigest);
    if (record.status === "completed") continue;
    if (record.direction === "sui-to-solana") suiToSolana += BigInt(record.amountBaseUnits);
    else solanaToSui += BigInt(record.amountBaseUnits);
  }
  return { inFlightSuiToSolanaBaseUnits: suiToSolana.toString(), inFlightSolanaToSuiBaseUnits: solanaToSui.toString() };
}
