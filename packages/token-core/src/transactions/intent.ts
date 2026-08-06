import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { TOKEN } from "../constants.js";
import { verifyMpcProposalApproval, type MpcProposal } from "../ai/mpc.js";

const amount = z.string().regex(/^\d+$/);
const intentSchema = z.object({
  intentId: z.string().min(12), nonce: z.string().min(16), reference: z.string().min(8),
  chain: z.enum(["sui", "solana"]), network: z.string().min(1),
  kind: z.enum(["ai-payment", "refund", "treasury-transfer"]),
  from: z.string().min(3), to: z.string().min(3), amountBaseUnits: amount,
  assetId: z.string().min(3), createdAt: z.iso.datetime(), expiresAt: z.iso.datetime(),
  metadataDigest: z.string().min(32), originalTransactionId: z.string().min(16).optional(),
}).superRefine((intent, context) => {
  if (intent.kind === "refund" && !intent.originalTransactionId) context.addIssue({ code: "custom", path: ["originalTransactionId"], message: "refund requires the original transaction" });
  if (intent.kind !== "refund" && intent.originalTransactionId) context.addIssue({ code: "custom", path: ["originalTransactionId"], message: "original transaction is valid only for refunds" });
  const validNetwork = intent.chain === "solana"
    ? ["mainnet-beta", "testnet", "devnet"].includes(intent.network)
    : ["mainnet", "testnet", "devnet", "localnet"].includes(intent.network);
  if (!validNetwork) context.addIssue({ code: "custom", path: ["network"], message: "network is invalid for the selected chain" });
});

export type TransactionIntent = z.infer<typeof intentSchema>;
export type TransactionStatus = "planned" | "authorized" | "submitted" | "confirmed" | "failed";
export interface TransactionRecord {
  intent: TransactionIntent; payloadDigest: string; status: TransactionStatus;
  proposalId?: string; transactionId?: string; submittedAt?: string; confirmedAt?: string; failureReason?: string;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}
export function digestTransactionIntent(intent: TransactionIntent): string {
  return createHash("sha256").update(canonical(intent)).digest("hex");
}

function validateAddress(chain: TransactionIntent["chain"], value: string, label: string): void {
  if (chain === "sui") {
    if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`invalid Sui ${label}`);
  } else {
    try { new PublicKey(value); } catch (error) { throw new Error(`invalid Solana ${label}`, { cause: error }); }
  }
}

function validateAsset(chain: TransactionIntent["chain"], assetId: string): void {
  if (chain === "sui") {
    if (!/^0x[0-9a-fA-F]{64}::jarvis::JARVIS$/.test(assetId)) throw new Error("invalid Sui JARVIS coin type");
  } else {
    validateAddress("solana", assetId, "JARVIS mint");
  }
}

/** Builds an inert intent and rejects replayed identities before any signing system sees it. */
export function createTransactionIntent(input: unknown, existing: Iterable<TransactionRecord> = []): TransactionRecord {
  const intent = intentSchema.parse(input);
  validateAddress(intent.chain, intent.from, "sender"); validateAddress(intent.chain, intent.to, "recipient");
  validateAsset(intent.chain, intent.assetId);
  if (intent.from === intent.to) throw new Error("sender and recipient must differ");
  const value = BigInt(intent.amountBaseUnits);
  if (value === 0n || value > TOKEN.maximumBaseUnits) throw new Error("transaction amount is outside JARVIS bounds");
  if (Date.parse(intent.expiresAt) <= Date.parse(intent.createdAt)) throw new Error("transaction expiry must follow creation");
  for (const record of existing) {
    if (record.intent.intentId === intent.intentId) throw new Error("duplicate transaction intent ID");
    if (record.intent.nonce === intent.nonce) throw new Error("duplicate transaction nonce");
    if (record.intent.reference === intent.reference) throw new Error("duplicate transaction reference");
  }
  return { intent, payloadDigest: digestTransactionIntent(intent), status: "planned" };
}

export function authorizeTransactionIntent(record: TransactionRecord, proposal: MpcProposal, policyInput: unknown, now: string): TransactionRecord {
  z.iso.datetime().parse(now);
  if (record.status !== "planned") throw new Error("transaction is not awaiting authorization");
  if (Date.parse(now) >= Date.parse(record.intent.expiresAt)) throw new Error("transaction intent expired");
  verifyMpcProposalApproval(proposal, policyInput, now);
  if (proposal.payloadDigest !== record.payloadDigest || proposal.amountBaseUnits !== record.intent.amountBaseUnits) throw new Error("MPC proposal does not bind the transaction intent");
  const requiredOperation = record.intent.kind === "treasury-transfer" ? "treasury-transfer" : "ai-settlement";
  if (proposal.operation !== requiredOperation) throw new Error("MPC operation does not authorize transaction kind");
  return { ...record, status: "authorized", proposalId: proposal.proposalId };
}

export function markTransactionSubmitted(record: TransactionRecord, transactionId: string, submittedAt: string): TransactionRecord {
  z.iso.datetime().parse(submittedAt);
  if (record.status !== "authorized") throw new Error("transaction is not authorized for submission");
  if (transactionId.length < 16) throw new Error("invalid transaction identifier");
  if (Date.parse(submittedAt) >= Date.parse(record.intent.expiresAt)) throw new Error("transaction intent expired before submission");
  return { ...record, status: "submitted", transactionId, submittedAt };
}

export function confirmTransaction(record: TransactionRecord, receipt: { transactionId: string; from: string; to: string; amountBaseUnits: string; reference: string; finalized: boolean; success: boolean; observedAt: string }): TransactionRecord {
  z.iso.datetime().parse(receipt.observedAt);
  if (record.status !== "submitted") throw new Error("transaction is not awaiting confirmation");
  if (!receipt.finalized) throw new Error("transaction receipt is not finalized");
  if (Date.parse(receipt.observedAt) < Date.parse(record.submittedAt!)) throw new Error("receipt predates submission");
  if (receipt.transactionId !== record.transactionId) throw new Error("transaction receipt ID does not match submitted transaction");
  if (!receipt.success) return { ...record, status: "failed", failureReason: "finalized transaction failed", confirmedAt: receipt.observedAt };
  if (receipt.from !== record.intent.from || receipt.to !== record.intent.to || receipt.amountBaseUnits !== record.intent.amountBaseUnits || receipt.reference !== record.intent.reference) throw new Error("transaction receipt does not match intent");
  return { ...record, status: "confirmed", confirmedAt: receipt.observedAt };
}

export function createRefundIntent(confirmedPayment: TransactionRecord, input: Omit<TransactionIntent, "kind" | "originalTransactionId">, existing: Iterable<TransactionRecord> = []): TransactionRecord {
  if (confirmedPayment.status !== "confirmed" || confirmedPayment.intent.kind !== "ai-payment") throw new Error("refund requires a confirmed AI payment");
  if (input.chain !== confirmedPayment.intent.chain || input.network !== confirmedPayment.intent.network || input.assetId !== confirmedPayment.intent.assetId || input.from !== confirmedPayment.intent.to || input.to !== confirmedPayment.intent.from) throw new Error("refund chain, network, asset, or parties do not reverse the payment");
  const existingRecords = [...existing];
  const alreadyRefunded = existingRecords
    .filter((record) => record.intent.kind === "refund" && record.intent.originalTransactionId === confirmedPayment.transactionId && record.status !== "failed")
    .reduce((sum, record) => sum + BigInt(record.intent.amountBaseUnits), 0n);
  if (alreadyRefunded + BigInt(input.amountBaseUnits) > BigInt(confirmedPayment.intent.amountBaseUnits)) throw new Error("cumulative refund exceeds original payment");
  return createTransactionIntent({ ...input, kind: "refund", originalTransactionId: confirmedPayment.transactionId }, existingRecords);
}
