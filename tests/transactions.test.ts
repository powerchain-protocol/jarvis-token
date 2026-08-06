import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { authorizeTransactionIntent, confirmTransaction, createRefundIntent, createTransactionIntent, markTransactionSubmitted, validateTransactionRecord } from "../packages/token-core/src/transactions/intent.js";

const from = Keypair.generate().publicKey.toBase58(); const to = Keypair.generate().publicKey.toBase58(); const mint = Keypair.generate().publicKey.toBase58();
const input = { intentId: "intent-0000001", nonce: "nonce-00000000001", reference: "ai-order-1", chain: "solana", network: "devnet", kind: "ai-payment", from, to, amountBaseUnits: "100", assetId: mint, createdAt: "2026-08-06T12:00:00.000Z", expiresAt: "2026-08-06T13:00:00.000Z", metadataDigest: "m".repeat(64) } as const;
const policy = { policyId: "policy-0001", participants: ["alice", "bob", "carol"], threshold: 2, allowedOperations: ["ai-settlement"], maximumPaymentBaseUnits: "1000" } as const;
const transactionId = "3".repeat(88);
const blockAnchor = { chain: "solana", network: "devnet", blockHeight: "123456", blockHash: "6".repeat(44), finality: "finalized" } as const;

describe("guarded transaction intents", () => {
  it("binds MPC approval and exact finalized receipt", () => {
    const planned = createTransactionIntent(input);
    const proposal = { proposalId: "proposal-1", policyId: "policy-0001", operation: "ai-settlement" as const, amountBaseUnits: "100", payloadDigest: planned.payloadDigest, expiresAt: input.expiresAt, approvals: ["alice", "bob"], status: "approved" as const };
    const authorized = authorizeTransactionIntent(planned, proposal, policy, "2026-08-06T12:10:00.000Z");
    const submitted = markTransactionSubmitted(authorized, transactionId, "2026-08-06T12:20:00.000Z");
    const confirmed = confirmTransaction(submitted, { transactionId, from, to, amountBaseUnits: "100", reference: input.reference, finalized: true, success: true, observedAt: "2026-08-06T12:21:00.000Z", blockAnchor });
    expect(confirmed.status).toBe("confirmed");
    expect(() => confirmTransaction(submitted, { transactionId, from, to, amountBaseUnits: "101", reference: input.reference, finalized: true, success: true, observedAt: "2026-08-06T12:21:00.000Z", blockAnchor })).toThrow(/does not match/);
    expect(() => confirmTransaction(submitted, { transactionId: "wrong".repeat(16), from, to, amountBaseUnits: "100", reference: input.reference, finalized: true, success: false, observedAt: "2026-08-06T12:21:00.000Z", blockAnchor })).toThrow(/ID does not match/);
  });

  it("rejects nonce/reference replay and unbound approval", () => {
    const planned = createTransactionIntent(input);
    expect(() => createTransactionIntent({ ...input, intentId: "intent-0000002" }, [planned])).toThrow(/nonce/);
    const wrong = { proposalId: "proposal-1", policyId: "policy-0001", operation: "ai-settlement" as const, amountBaseUnits: "100", payloadDigest: "x".repeat(64), expiresAt: input.expiresAt, approvals: ["alice", "bob"], status: "approved" as const };
    expect(() => authorizeTransactionIntent(planned, wrong, policy, "2026-08-06T12:10:00.000Z")).toThrow(/does not bind/);
    const expired = { ...wrong, payloadDigest: planned.payloadDigest, expiresAt: "2026-08-06T12:05:00.000Z" };
    expect(() => authorizeTransactionIntent(planned, expired, policy, "2026-08-06T12:10:00.000Z")).toThrow(/proposal expired/);
    expect(() => authorizeTransactionIntent(planned, { ...wrong, payloadDigest: planned.payloadDigest, approvals: ["alice"] }, policy, "2026-08-06T12:01:00.000Z")).toThrow(/threshold/);
    expect(() => createTransactionIntent({ ...input, network: "mainnet" })).toThrow(/network is invalid/);
    expect(() => createTransactionIntent({ ...input, assetId: "JARVIS" })).toThrow(/invalid Solana/);
  });

  it("limits refunds to confirmed original payments", () => {
    const planned = createTransactionIntent(input);
    const proposal = { proposalId: "proposal-1", policyId: "policy-0001", operation: "ai-settlement" as const, amountBaseUnits: "100", payloadDigest: planned.payloadDigest, expiresAt: input.expiresAt, approvals: ["alice", "bob"], status: "approved" as const };
    const authorized = authorizeTransactionIntent(planned, proposal, policy, "2026-08-06T12:10:00.000Z");
    const submitted = markTransactionSubmitted(authorized, transactionId, "2026-08-06T12:20:00.000Z");
    const confirmed = confirmTransaction(submitted, { transactionId, from, to, amountBaseUnits: "100", reference: input.reference, finalized: true, success: true, observedAt: "2026-08-06T12:21:00.000Z", blockAnchor });
    const refundBase = { ...input, intentId: "refund-0000001", nonce: "refund-nonce-00001", reference: "refund-1", from: to, to: from, amountBaseUnits: "100", createdAt: "2026-08-06T12:30:00.000Z", expiresAt: "2026-08-06T13:30:00.000Z" };
    const first = createRefundIntent(confirmed, { ...refundBase, amountBaseUnits: "60" });
    expect(first.intent.kind).toBe("refund");
    expect(() => createRefundIntent(confirmed, { ...refundBase, intentId: "refund-0000002", nonce: "refund-nonce-00002", reference: "refund-2", amountBaseUnits: "41" }, [first])).toThrow(/cumulative/);
    expect(() => createRefundIntent(confirmed, { ...refundBase, amountBaseUnits: "101" })).toThrow(/exceeds/);
    expect(() => createRefundIntent(confirmed, { ...refundBase, assetId: Keypair.generate().publicKey.toBase58() })).toThrow(/asset/);
  });

  it("rejects corrupted persisted lifecycle and digest state", () => {
    const planned = createTransactionIntent(input);
    expect(() => validateTransactionRecord({ ...planned, payloadDigest: "0".repeat(64) })).toThrow(/digest mismatch/);
    expect(() => validateTransactionRecord({ ...planned, status: "confirmed", confirmedAt: "2026-08-06T12:21:00.000Z" })).toThrow(/missing authorization/);
    expect(() => validateTransactionRecord({ ...planned, transactionId: "tx".repeat(32) })).toThrow(/later lifecycle/);
  });

  it("binds native network-fee ceilings without mixing them into JARVIS value", () => {
    const networkFeeQuote = { quoteId: "fee-quote-0001", chain: "solana", network: "devnet", nativeAsset: "SOL", estimatedBaseUnits: "10", maximumBaseUnits: "20", quotedAt: "2026-08-06T12:00:00.000Z", expiresAt: "2026-08-06T12:30:00.000Z", sourceDigest: "f".repeat(64) } as const;
    const planned = createTransactionIntent({ ...input, networkFeeQuote });
    const proposal = { proposalId: "proposal-1", policyId: "policy-0001", operation: "ai-settlement" as const, amountBaseUnits: "100", payloadDigest: planned.payloadDigest, expiresAt: input.expiresAt, approvals: ["alice", "bob"], status: "approved" as const };
    const authorized = authorizeTransactionIntent(planned, proposal, policy, "2026-08-06T12:10:00.000Z");
    const submitted = markTransactionSubmitted(authorized, transactionId, "2026-08-06T12:20:00.000Z");
    const receipt = { transactionId, from, to, amountBaseUnits: "100", reference: input.reference, finalized: true, success: true, observedAt: "2026-08-06T12:21:00.000Z", blockAnchor } as const;
    expect(confirmTransaction(submitted, { ...receipt, networkFeeBaseUnits: "15" }).confirmedNetworkFeeBaseUnits).toBe("15");
    expect(() => confirmTransaction(submitted, receipt)).toThrow(/missing network fee/);
    expect(() => confirmTransaction(submitted, { ...receipt, networkFeeBaseUnits: "21" })).toThrow(/exceeds authorized maximum/);
    expect(() => markTransactionSubmitted(authorized, transactionId, "2026-08-06T12:30:00.000Z")).toThrow(/fee quote expired/);
    expect(() => createTransactionIntent({ ...input, networkFeeQuote: { ...networkFeeQuote, nativeAsset: "SUI" } })).toThrow(/asset does not match chain/);
    expect(() => confirmTransaction(submitted, { ...receipt, networkFeeBaseUnits: "15", blockAnchor: { ...blockAnchor, network: "testnet" } })).toThrow(/network does not match/);
    expect(planned.intent.amountBaseUnits).toBe("100");
  });
});
