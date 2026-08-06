import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validateBridgeTransferRecord, type BridgeTransferRecord } from "../bridge/transfer.js";
import { validateAiLedger, type AiLedger } from "../ai/ledger.js";
import { buildAllocationCommitment, finalizedAllocationClaimEventSchema, validateApprovedAllocationPlan, verifyVestingSnapshot } from "../tokenomics.js";
import { validateTransactionRecord, type TransactionRecord } from "../transactions/intent.js";
import { sha256CanonicalJson } from "../utils/canonical-json.js";
import { digestBlockFinalityAnchor } from "../blockchains.js";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function digestAuditPayload(value: unknown): string {
  return sha256CanonicalJson(value);
}

const auditEventSchema = z.object({
  aggregateType: z.string().min(1).max(64).regex(/^[a-z][a-z0-9-]*$/),
  aggregateId: z.string().min(3).max(256),
  eventType: z.string().min(1).max(96).regex(/^[a-z][a-z0-9-]*$/),
  occurredAt: z.iso.datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export function assertBridgePersistenceTransition(previous: BridgeTransferRecord, next: BridgeTransferRecord): void {
  const allowed: Record<BridgeTransferRecord["status"], BridgeTransferRecord["status"][]> = {
    "pending-attestations": ["pending-attestations", "ready-to-redeem", "manual-review"],
    "ready-to-redeem": ["ready-to-redeem", "completed", "manual-review"],
    completed: ["completed"],
    "manual-review": ["manual-review"],
  };
  if (!allowed[previous.status].includes(next.status)) throw new Error("invalid persisted bridge status transition");
  if (previous.transferId !== next.transferId || previous.messageDigest !== next.messageDigest || previous.direction !== next.direction || previous.amountBaseUnits !== next.amountBaseUnits) throw new Error("immutable bridge transfer identity changed");
}

export function assertTransactionPersistenceTransition(previous: TransactionRecord, next: TransactionRecord): void {
  const allowed: Record<TransactionRecord["status"], TransactionRecord["status"][]> = {
    planned: ["planned", "authorized"], authorized: ["authorized", "submitted"],
    submitted: ["submitted", "confirmed", "failed"], confirmed: ["confirmed"], failed: ["failed"],
  };
  if (previous.payloadDigest !== next.payloadDigest || previous.intent.intentId !== next.intent.intentId) throw new Error("immutable transaction intent changed");
  if (!allowed[previous.status].includes(next.status)) throw new Error("invalid persisted transaction status transition");
}

export function assertAiLedgerPersistenceTransition(previous: AiLedger, next: AiLedger): void {
  if (previous.accountId !== next.accountId) throw new Error("AI ledger account identity changed");
  if (BigInt(next.balanceBaseUnits) > BigInt(previous.balanceBaseUnits)) throw new Error("AI ledger balance cannot increase through state persistence");
  const nextById = new Map(next.reservations.map((item) => [item.id, item]));
  for (const item of previous.reservations) {
    const replacement = nextById.get(item.id);
    if (!replacement) throw new Error("AI ledger reservation history cannot be removed");
    if (replacement.idempotencyKey !== item.idempotencyKey || replacement.sessionId !== item.sessionId || replacement.amountBaseUnits !== item.amountBaseUnits) throw new Error("immutable AI reservation identity changed");
    if (item.status !== "reserved" && (replacement.status !== item.status || replacement.settledBaseUnits !== item.settledBaseUnits)) throw new Error("terminal AI reservation changed");
    if (item.status === "reserved" && !["reserved", "settled", "cancelled"].includes(replacement.status)) throw new Error("invalid AI reservation transition");
  }
}

export function assertTransactionFinalityProjection(record: TransactionRecord, stored: { finalityBlockHeight: string | null; finalityBlockHash: string | null; finalityAnchorDigest: string | null }): void {
  const expected = record.blockAnchor;
  if (!expected) {
    if (stored.finalityBlockHeight !== null || stored.finalityBlockHash !== null || stored.finalityAnchorDigest !== null) throw new Error("transaction finality projection exists without an anchor");
    return;
  }
  if (stored.finalityBlockHeight !== expected.blockHeight || stored.finalityBlockHash !== expected.blockHash || stored.finalityAnchorDigest !== digestBlockFinalityAnchor(expected)) throw new Error("transaction finality projection does not match payload");
}

export class JarvisRepositories {
  constructor(private readonly db: PrismaClient) {}

  async saveBridgeTransfer(input: unknown, expectedVersion?: number) {
    const record = validateBridgeTransferRecord(input);
    return this.db.$transaction(async (tx) => {
      const existing = await tx.bridgeTransfer.findUnique({ where: { transferId: record.transferId }, select: { version: true, payload: true } });
      if (!existing) {
        if (expectedVersion !== undefined) throw new Error("bridge transfer does not exist at expected version");
        return tx.bridgeTransfer.create({ data: {
          transferId: record.transferId, messageDigest: record.messageDigest, direction: record.direction, status: record.status,
          amountBaseUnits: record.amountBaseUnits, payload: json(record),
          attestations: { create: record.attestations.map((item) => ({ attestationId: item.attestationId, transceiver: item.transceiver, observedAt: new Date(item.observedAt), payload: json(item) })) },
        }});
      }
      if (expectedVersion === undefined || existing.version !== expectedVersion) throw new Error("bridge transfer optimistic-lock conflict");
      assertBridgePersistenceTransition(validateBridgeTransferRecord(existing.payload), record);
      const updated = await tx.bridgeTransfer.updateMany({ where: { transferId: record.transferId, version: expectedVersion }, data: {
        status: record.status, amountBaseUnits: record.amountBaseUnits, payload: json(record), version: { increment: 1 },
      }});
      if (updated.count !== 1) throw new Error("bridge transfer optimistic-lock conflict");
      await tx.bridgeAttestation.deleteMany({ where: { transferId: record.transferId } });
      if (record.attestations.length) await tx.bridgeAttestation.createMany({ data: record.attestations.map((item) => ({ transferId: record.transferId, attestationId: item.attestationId, transceiver: item.transceiver, observedAt: new Date(item.observedAt), payload: json(item) })) });
      return tx.bridgeTransfer.findUniqueOrThrow({ where: { transferId: record.transferId } });
    });
  }

  async loadBridgeTransfer(transferId: string): Promise<{ record: BridgeTransferRecord; version: number } | null> {
    const stored = await this.db.bridgeTransfer.findUnique({ where: { transferId } });
    return stored ? { record: validateBridgeTransferRecord(stored.payload), version: stored.version } : null;
  }

  async saveTransactionIntent(input: unknown, expectedVersion?: number) {
    const record = validateTransactionRecord(input);
    const data = {
      nonce: record.intent.nonce, businessReference: record.intent.reference,
      payloadDigest: record.payloadDigest, chain: record.intent.chain,
      network: record.intent.network, status: record.status,
      finalityBlockHeight: record.blockAnchor?.blockHeight ?? null,
      finalityBlockHash: record.blockAnchor?.blockHash ?? null,
      finalityAnchorDigest: record.blockAnchor ? digestBlockFinalityAnchor(record.blockAnchor) : null,
      payload: json(record),
    };
    return this.db.$transaction(async (tx) => {
      const existing = await tx.transactionIntentRecord.findUnique({ where: { intentId: record.intent.intentId }, select: { version: true, payload: true } });
      if (!existing) {
        if (expectedVersion !== undefined) throw new Error("transaction intent does not exist at expected version");
        return tx.transactionIntentRecord.create({ data: { intentId: record.intent.intentId, ...data } });
      }
      if (expectedVersion === undefined || existing.version !== expectedVersion) throw new Error("transaction intent optimistic-lock conflict");
      assertTransactionPersistenceTransition(validateTransactionRecord(existing.payload), record);
      const updated = await tx.transactionIntentRecord.updateMany({
        where: { intentId: record.intent.intentId, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("transaction intent optimistic-lock conflict");
      return tx.transactionIntentRecord.findUniqueOrThrow({ where: { intentId: record.intent.intentId } });
    });
  }

  async loadTransactionIntent(intentId: string): Promise<{ record: TransactionRecord; version: number } | null> {
    const stored = await this.db.transactionIntentRecord.findUnique({ where: { intentId } });
    if (!stored) return null;
    const record = validateTransactionRecord(stored.payload);
    assertTransactionFinalityProjection(record, stored);
    return { record, version: stored.version };
  }

  async saveAiLedger(ledgerId: string, input: AiLedger, expectedVersion?: number) {
    if (ledgerId.length < 8) throw new Error("invalid ledger ID");
    validateAiLedger(input);
    return this.db.$transaction(async (tx) => {
      const existing = await tx.aiLedgerState.findUnique({ where: { ledgerId }, select: { version: true, payload: true } });
      if (!existing) {
        if (expectedVersion !== undefined) throw new Error("AI ledger does not exist at expected version");
        return tx.aiLedgerState.create({ data: { ledgerId, accountId: input.accountId, payload: json(input) } });
      }
      if (expectedVersion === undefined || existing.version !== expectedVersion) throw new Error("AI ledger optimistic-lock conflict");
      const previous = existing.payload as unknown as AiLedger;
      validateAiLedger(previous);
      assertAiLedgerPersistenceTransition(previous, input);
      const updated = await tx.aiLedgerState.updateMany({
        where: { ledgerId, version: expectedVersion },
        data: { accountId: input.accountId, payload: json(input), version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("AI ledger optimistic-lock conflict");
      return tx.aiLedgerState.findUniqueOrThrow({ where: { ledgerId } });
    });
  }

  async loadAiLedger(ledgerId: string): Promise<{ ledger: AiLedger; version: number } | null> {
    const stored = await this.db.aiLedgerState.findUnique({ where: { ledgerId } });
    if (!stored) return null;
    const ledger = stored.payload as unknown as AiLedger;
    validateAiLedger(ledger);
    return { ledger, version: stored.version };
  }

  async saveApprovedAllocationPlan(input: unknown) {
    const plan = validateApprovedAllocationPlan(input); const commitment = buildAllocationCommitment(plan);
    return this.db.allocationPlan.create({ data: {
      allocationCommitmentSha256: commitment.allocationCommitmentSha256, tokenVersion: plan.tokenVersion,
      governanceRecord: plan.governanceRecord, approvedAt: new Date(plan.approvedAt!), payload: json(plan),
    }});
  }

  async appendFinalizedClaim(allocationCommitmentSha256: string, input: unknown) {
    const event = finalizedAllocationClaimEventSchema.parse(input);
    return this.db.claimEvent.create({ data: {
      claimId: event.claimId, transactionId: event.transactionId, allocationCommitmentSha256, allocationId: event.allocationId,
      chain: event.chain, network: event.network, amountBaseUnits: event.amountBaseUnits,
      finalityBlockHeight: event.blockAnchor.blockHeight, finalityBlockHash: event.blockAnchor.blockHash,
      finalityAnchorDigest: digestBlockFinalityAnchor(event.blockAnchor),
      claimedAt: new Date(event.claimedAt), observedAt: new Date(event.observedAt), payload: json(event),
    }});
  }

  async saveVerifiedVestingSnapshot(snapshot: unknown, plan: unknown, claims: unknown) {
    const verified = verifyVestingSnapshot(snapshot, plan, claims, true);
    return this.db.vestingSnapshot.create({ data: {
      snapshotSha256: verified.snapshotSha256, allocationCommitmentSha256: verified.allocationCommitmentSha256,
      claimLedgerSha256: verified.claimLedgerSha256, asOf: new Date(verified.asOf), payload: json(snapshot),
    }});
  }

  async appendAuditEvent(input: { aggregateType: string; aggregateId: string; eventType: string; occurredAt: string; payload: unknown }) {
    const event = auditEventSchema.parse(input);
    const payloadDigest = digestAuditPayload(event.payload);
    return this.db.auditEvent.create({ data: { ...event, occurredAt: new Date(event.occurredAt), payloadDigest, payload: json(event.payload) } });
  }
}
