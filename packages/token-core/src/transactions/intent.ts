import { createHash } from "node:crypto";
import { z } from "zod";
import { TOKEN } from "../constants.js";
import { verifyMpcProposalApproval, type MpcProposal } from "../ai/mpc.js";
import { canonicalJson } from "../utils/canonical-json.js";
import { assertChainNetwork, parseSolanaAddress, parseSolanaTransactionSignature, parseSuiAddressOrObject, parseSuiTransactionDigest } from "../utils/chains.js";
import { assertNetworkFeeAtMost, networkFeeQuoteSchema, validateNetworkFeeQuote } from "./fees.js";
import { blockFinalityAnchorSchema, validateBlockFinalityAnchor, type BlockFinalityAnchor } from "../blockchains.js";

const amount = z.string().regex(/^\d+$/);
export const transactionIntentSchema = z.object({
  intentId: z.string().min(12), nonce: z.string().min(16), reference: z.string().min(8),
  chain: z.enum(["sui", "solana"]), network: z.string().min(1),
  kind: z.enum(["ai-payment", "refund", "treasury-transfer"]),
  from: z.string().min(3), to: z.string().min(3), amountBaseUnits: amount,
  assetId: z.string().min(3), createdAt: z.iso.datetime(), expiresAt: z.iso.datetime(),
  metadataDigest: z.string().min(32), originalTransactionId: z.string().min(16).optional(),
  networkFeeQuote: networkFeeQuoteSchema.optional(),
}).superRefine((intent, context) => {
  if (intent.kind === "refund" && !intent.originalTransactionId) context.addIssue({ code: "custom", path: ["originalTransactionId"], message: "refund requires the original transaction" });
  if (intent.kind !== "refund" && intent.originalTransactionId) context.addIssue({ code: "custom", path: ["originalTransactionId"], message: "original transaction is valid only for refunds" });
  try { assertChainNetwork(intent.chain, intent.network); }
  catch { context.addIssue({ code: "custom", path: ["network"], message: "network is invalid for the selected chain" }); }
  if (intent.networkFeeQuote) {
    if (intent.networkFeeQuote.chain !== intent.chain || intent.networkFeeQuote.network !== intent.network) context.addIssue({ code: "custom", path: ["networkFeeQuote"], message: "network fee quote does not match transaction chain and network" });
    if (Date.parse(intent.networkFeeQuote.quotedAt) < Date.parse(intent.createdAt)) context.addIssue({ code: "custom", path: ["networkFeeQuote", "quotedAt"], message: "network fee quote predates transaction intent" });
    if (Date.parse(intent.networkFeeQuote.expiresAt) > Date.parse(intent.expiresAt)) context.addIssue({ code: "custom", path: ["networkFeeQuote", "expiresAt"], message: "network fee quote cannot outlive transaction intent" });
  }
});

export type TransactionIntent = z.infer<typeof transactionIntentSchema>;
export type TransactionStatus = "planned" | "authorized" | "submitted" | "confirmed" | "failed";
export interface TransactionRecord {
  intent: TransactionIntent; payloadDigest: string; status: TransactionStatus;
  proposalId?: string; transactionId?: string; submittedAt?: string; confirmedAt?: string; failureReason?: string;
  confirmedNetworkFeeBaseUnits?: string;
  blockAnchor?: BlockFinalityAnchor;
}

const transactionRecordSchema = z.object({
  intent: transactionIntentSchema,
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["planned", "authorized", "submitted", "confirmed", "failed"]),
  proposalId: z.string().min(8).optional(),
  transactionId: z.string().min(16).optional(),
  submittedAt: z.iso.datetime().optional(),
  confirmedAt: z.iso.datetime().optional(),
  failureReason: z.string().min(1).optional(),
  confirmedNetworkFeeBaseUnits: z.string().regex(/^(0|[1-9]\d*)$/).optional(),
  blockAnchor: blockFinalityAnchorSchema.optional(),
});

export function digestTransactionIntent(intent: TransactionIntent): string {
  return createHash("sha256").update(canonicalJson(intent)).digest("hex");
}

/** Revalidates an externally loaded transaction record before any mutation or persistence. */
export function validateTransactionRecord(input: unknown): TransactionRecord {
  const record = transactionRecordSchema.parse(input);
  const intent = transactionIntentSchema.parse(record.intent);
  validateAddress(intent.chain, intent.from, "sender"); validateAddress(intent.chain, intent.to, "recipient");
  validateAsset(intent.chain, intent.assetId);
  if (intent.from === intent.to) throw new Error("sender and recipient must differ");
  const amount = BigInt(intent.amountBaseUnits);
  if (amount === 0n || amount > TOKEN.maximumBaseUnits) throw new Error("transaction amount is outside JARVIS bounds");
  if (Date.parse(intent.expiresAt) <= Date.parse(intent.createdAt)) throw new Error("transaction expiry must follow creation");
  if (record.payloadDigest !== digestTransactionIntent(intent)) throw new Error("transaction payload digest mismatch");

  const hasProposal = record.proposalId !== undefined;
  const hasSubmission = record.transactionId !== undefined || record.submittedAt !== undefined;
  const hasConfirmation = record.confirmedAt !== undefined;
  const hasConfirmedFee = record.confirmedNetworkFeeBaseUnits !== undefined;
  const hasBlockAnchor = record.blockAnchor !== undefined;
  if (record.status === "planned" && (hasProposal || hasSubmission || hasConfirmation || record.failureReason || hasConfirmedFee || hasBlockAnchor)) throw new Error("planned transaction contains later lifecycle evidence");
  if (record.status === "authorized" && (!hasProposal || hasSubmission || hasConfirmation || record.failureReason || hasConfirmedFee || hasBlockAnchor)) throw new Error("authorized transaction lifecycle evidence is inconsistent");
  if (["submitted", "confirmed", "failed"].includes(record.status) && (!hasProposal || !record.transactionId || !record.submittedAt)) throw new Error("submitted transaction is missing authorization or submission evidence");
  if (record.submittedAt && Date.parse(record.submittedAt) < Date.parse(intent.createdAt)) throw new Error("transaction submission predates intent creation");
  if (record.status === "submitted" && (hasConfirmation || record.failureReason || hasConfirmedFee || hasBlockAnchor)) throw new Error("submitted transaction contains terminal evidence");
  if (record.status === "confirmed" && (!hasConfirmation || record.failureReason)) throw new Error("confirmed transaction evidence is inconsistent");
  if (record.status === "failed" && (!hasConfirmation || !record.failureReason)) throw new Error("failed transaction evidence is inconsistent");
  if (["confirmed", "failed"].includes(record.status) && !record.blockAnchor) throw new Error("terminal transaction is missing finalized block anchor");
  if (record.blockAnchor) validateBlockFinalityAnchor(record.blockAnchor, intent.chain, intent.network);
  if (intent.networkFeeQuote) {
    validateNetworkFeeQuote(intent.networkFeeQuote, intent.chain, intent.network);
    if (["confirmed", "failed"].includes(record.status) && !hasConfirmedFee) throw new Error("terminal transaction is missing network fee evidence");
    if (record.confirmedNetworkFeeBaseUnits !== undefined) assertNetworkFeeAtMost(intent.networkFeeQuote, record.confirmedNetworkFeeBaseUnits);
  } else if (hasConfirmedFee) throw new Error("transaction contains unquoted network fee evidence");
  if (record.confirmedAt && record.submittedAt && Date.parse(record.confirmedAt) < Date.parse(record.submittedAt)) throw new Error("transaction confirmation predates submission");
  return JSON.parse(JSON.stringify(record)) as TransactionRecord;
}

function validateAddress(chain: TransactionIntent["chain"], value: string, label: string): void {
  if (chain === "sui") {
    try { parseSuiAddressOrObject(value); } catch (error) { throw new Error(`invalid Sui ${label}`, { cause: error }); }
  } else {
    try { parseSolanaAddress(value); } catch (error) { throw new Error(`invalid Solana ${label}`, { cause: error }); }
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
  const intent = transactionIntentSchema.parse(input);
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
  validateTransactionRecord(record);
  z.iso.datetime().parse(now);
  if (record.status !== "planned") throw new Error("transaction is not awaiting authorization");
  if (Date.parse(now) >= Date.parse(record.intent.expiresAt)) throw new Error("transaction intent expired");
  if (record.intent.networkFeeQuote && Date.parse(now) >= Date.parse(record.intent.networkFeeQuote.expiresAt)) throw new Error("network fee quote expired before authorization");
  verifyMpcProposalApproval(proposal, policyInput, now);
  if (proposal.payloadDigest !== record.payloadDigest || proposal.amountBaseUnits !== record.intent.amountBaseUnits) throw new Error("MPC proposal does not bind the transaction intent");
  const requiredOperation = record.intent.kind === "treasury-transfer" ? "treasury-transfer" : "ai-settlement";
  if (proposal.operation !== requiredOperation) throw new Error("MPC operation does not authorize transaction kind");
  return { ...record, status: "authorized", proposalId: proposal.proposalId };
}

export function markTransactionSubmitted(record: TransactionRecord, transactionId: string, submittedAt: string): TransactionRecord {
  validateTransactionRecord(record);
  z.iso.datetime().parse(submittedAt);
  if (record.status !== "authorized") throw new Error("transaction is not authorized for submission");
  try {
    if (record.intent.chain === "sui") parseSuiTransactionDigest(transactionId);
    else parseSolanaTransactionSignature(transactionId);
  } catch (error) { throw new Error("invalid chain transaction identifier", { cause: error }); }
  if (Date.parse(submittedAt) >= Date.parse(record.intent.expiresAt)) throw new Error("transaction intent expired before submission");
  if (record.intent.networkFeeQuote && Date.parse(submittedAt) >= Date.parse(record.intent.networkFeeQuote.expiresAt)) throw new Error("network fee quote expired before submission");
  return { ...record, status: "submitted", transactionId, submittedAt };
}

export function confirmTransaction(record: TransactionRecord, receipt: { transactionId: string; from: string; to: string; amountBaseUnits: string; reference: string; finalized: boolean; success: boolean; observedAt: string; networkFeeBaseUnits?: string; blockAnchor: BlockFinalityAnchor }): TransactionRecord {
  validateTransactionRecord(record);
  z.iso.datetime().parse(receipt.observedAt);
  if (record.status !== "submitted") throw new Error("transaction is not awaiting confirmation");
  if (!receipt.finalized) throw new Error("transaction receipt is not finalized");
  if (Date.parse(receipt.observedAt) < Date.parse(record.submittedAt!)) throw new Error("receipt predates submission");
  if (receipt.transactionId !== record.transactionId) throw new Error("transaction receipt ID does not match submitted transaction");
  const blockAnchor = validateBlockFinalityAnchor(receipt.blockAnchor, record.intent.chain, record.intent.network);
  const quote = record.intent.networkFeeQuote;
  if (quote && receipt.networkFeeBaseUnits === undefined) throw new Error("transaction receipt is missing network fee evidence");
  if (!quote && receipt.networkFeeBaseUnits !== undefined) throw new Error("transaction receipt contains an unquoted network fee");
  if (quote) assertNetworkFeeAtMost(quote, receipt.networkFeeBaseUnits!);
  const feeEvidence = receipt.networkFeeBaseUnits === undefined ? {} : { confirmedNetworkFeeBaseUnits: receipt.networkFeeBaseUnits };
  if (!receipt.success) return { ...record, ...feeEvidence, blockAnchor, status: "failed", failureReason: "finalized transaction failed", confirmedAt: receipt.observedAt };
  if (receipt.from !== record.intent.from || receipt.to !== record.intent.to || receipt.amountBaseUnits !== record.intent.amountBaseUnits || receipt.reference !== record.intent.reference) throw new Error("transaction receipt does not match intent");
  return { ...record, ...feeEvidence, blockAnchor, status: "confirmed", confirmedAt: receipt.observedAt };
}

export function createRefundIntent(confirmedPayment: TransactionRecord, input: Omit<TransactionIntent, "kind" | "originalTransactionId">, existing: Iterable<TransactionRecord> = []): TransactionRecord {
  validateTransactionRecord(confirmedPayment);
  if (confirmedPayment.status !== "confirmed" || confirmedPayment.intent.kind !== "ai-payment") throw new Error("refund requires a confirmed AI payment");
  if (input.chain !== confirmedPayment.intent.chain || input.network !== confirmedPayment.intent.network || input.assetId !== confirmedPayment.intent.assetId || input.from !== confirmedPayment.intent.to || input.to !== confirmedPayment.intent.from) throw new Error("refund chain, network, asset, or parties do not reverse the payment");
  const existingRecords = [...existing];
  const alreadyRefunded = existingRecords
    .filter((record) => record.intent.kind === "refund" && record.intent.originalTransactionId === confirmedPayment.transactionId && record.status !== "failed")
    .reduce((sum, record) => sum + BigInt(record.intent.amountBaseUnits), 0n);
  if (alreadyRefunded + BigInt(input.amountBaseUnits) > BigInt(confirmedPayment.intent.amountBaseUnits)) throw new Error("cumulative refund exceeds original payment");
  return createTransactionIntent({ ...input, kind: "refund", originalTransactionId: confirmedPayment.transactionId }, existingRecords);
}
