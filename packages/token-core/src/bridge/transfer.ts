import { z } from "zod";
import { bridgeConfigSchema, type BridgeConfig } from "./config.js";
import { TOKEN } from "../constants.js";

const uintString = z.string().regex(/^(0|[1-9][0-9]*)$/);
const createTransferSchema = z.object({
  transferId: z.string().min(16), messageDigest: z.string().regex(/^[a-f0-9]{64}$/),
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

export const bridgeTransferRecordSchema = z.object({
  transferId: z.string().min(16), messageDigest: z.string().regex(/^[a-f0-9]{64}$/),
  direction: z.enum(["sui-to-solana", "solana-to-sui"]), amountBaseUnits: uintString,
  sender: z.string().min(3), recipient: z.string().min(3), sourceTransaction: z.string().min(16),
  sourceAction: z.enum(["lock", "burn"]), destinationAction: z.enum(["mint", "release"]),
  startedAt: z.iso.datetime(), threshold: z.number().int().positive(),
  allowedTransceivers: z.array(z.string().min(3)).min(1),
  attestations: z.array(z.object({ transceiver: z.string().min(3), attestationId: z.string().min(16), observedAt: z.iso.datetime() })),
  status: z.enum(["pending-attestations", "ready-to-redeem", "completed", "manual-review"]),
  destinationTransaction: z.string().min(16).optional(), completedAt: z.iso.datetime().optional(), reviewReason: z.string().min(8).optional(),
}).superRefine((record, context) => {
  const amount = BigInt(record.amountBaseUnits);
  if (amount === 0n || amount > TOKEN.maximumBaseUnits) context.addIssue({ code: "custom", path: ["amountBaseUnits"], message: "persisted transfer amount is outside JARVIS bounds" });
  const suiToSolana = record.direction === "sui-to-solana";
  if (record.sourceAction !== (suiToSolana ? "lock" : "burn") || record.destinationAction !== (suiToSolana ? "mint" : "release")) context.addIssue({ code: "custom", path: ["direction"], message: "bridge actions do not match transfer direction" });
  const allowed = new Set(record.allowedTransceivers);
  if (allowed.size !== record.allowedTransceivers.length) context.addIssue({ code: "custom", path: ["allowedTransceivers"], message: "persisted transceivers must be unique" });
  if (record.threshold > allowed.size) context.addIssue({ code: "custom", path: ["threshold"], message: "persisted threshold exceeds unique transceivers" });
  const attesters = new Set<string>(); const attestationIds = new Set<string>();
  for (const [index, attestation] of record.attestations.entries()) {
    if (!allowed.has(attestation.transceiver)) context.addIssue({ code: "custom", path: ["attestations", index, "transceiver"], message: "persisted attestation uses unregistered transceiver" });
    if (attesters.has(attestation.transceiver)) context.addIssue({ code: "custom", path: ["attestations", index, "transceiver"], message: "persisted transceiver attestation is duplicated" });
    if (attestationIds.has(attestation.attestationId)) context.addIssue({ code: "custom", path: ["attestations", index, "attestationId"], message: "persisted attestation ID is duplicated" });
    if (Date.parse(attestation.observedAt) < Date.parse(record.startedAt)) context.addIssue({ code: "custom", path: ["attestations", index, "observedAt"], message: "persisted attestation predates transfer" });
    attesters.add(attestation.transceiver); attestationIds.add(attestation.attestationId);
  }
  const thresholdReached = record.attestations.length >= record.threshold;
  if (record.status === "pending-attestations" && thresholdReached) context.addIssue({ code: "custom", path: ["status"], message: "pending record already reached threshold" });
  if ((record.status === "ready-to-redeem" || record.status === "completed") && !thresholdReached) context.addIssue({ code: "custom", path: ["status"], message: "record status claims an unmet threshold" });
  if (record.status === "completed") {
    if (!record.destinationTransaction || !record.completedAt) context.addIssue({ code: "custom", path: ["status"], message: "completed record lacks destination evidence" });
    if (record.reviewReason) context.addIssue({ code: "custom", path: ["reviewReason"], message: "completed record cannot contain manual-review reason" });
    if (record.completedAt && record.attestations.some((item) => Date.parse(item.observedAt) > Date.parse(record.completedAt!))) context.addIssue({ code: "custom", path: ["completedAt"], message: "persisted completion predates attestation" });
  } else if (record.destinationTransaction || record.completedAt) context.addIssue({ code: "custom", path: ["destinationTransaction"], message: "non-completed record contains destination evidence" });
  if (record.status === "manual-review") {
    if (!record.reviewReason || record.reviewReason.trim().length < 8) context.addIssue({ code: "custom", path: ["reviewReason"], message: "manual-review record lacks a valid reason" });
  } else if (record.reviewReason) context.addIssue({ code: "custom", path: ["reviewReason"], message: "active record cannot contain manual-review reason" });
});

export function validateBridgeTransferRecord(input: unknown): BridgeTransferRecord {
  return bridgeTransferRecordSchema.parse(input) as BridgeTransferRecord;
}

function requireActive(input: BridgeTransferRecord): BridgeTransferRecord {
  const record = validateBridgeTransferRecord(input);
  if (record.status === "completed" || record.status === "manual-review") {
    throw new Error(`transfer ${record.transferId} is terminal: ${record.status}`);
  }
  return record;
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
  record = requireActive(record);
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
  record = requireActive(record);
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
  record = requireActive(record);
  if (reason.trim().length < 8) throw new Error("manual-review reason is too short");
  return { ...record, status: "manual-review", reviewReason: reason.trim() };
}

/** Aggregates unsettled value for the global supply snapshot. */
export function calculateInFlightBaseUnits(records: Iterable<BridgeTransferRecord>) {
  let suiToSolana = 0n;
  let solanaToSui = 0n;
  const transferIds = new Set<string>();
  const messageDigests = new Set<string>();
  for (const input of records) {
    const record = validateBridgeTransferRecord(input);
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
