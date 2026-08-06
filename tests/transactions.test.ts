import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { authorizeTransactionIntent, confirmTransaction, createRefundIntent, createTransactionIntent, markTransactionSubmitted } from "../packages/token-core/src/transactions/intent.js";

const from = Keypair.generate().publicKey.toBase58(); const to = Keypair.generate().publicKey.toBase58(); const mint = Keypair.generate().publicKey.toBase58();
const input = { intentId: "intent-0000001", nonce: "nonce-00000000001", reference: "ai-order-1", chain: "solana", network: "devnet", kind: "ai-payment", from, to, amountBaseUnits: "100", assetId: mint, createdAt: "2026-08-06T12:00:00.000Z", expiresAt: "2026-08-06T13:00:00.000Z", metadataDigest: "m".repeat(64) } as const;
const policy = { policyId: "policy-0001", participants: ["alice", "bob", "carol"], threshold: 2, allowedOperations: ["ai-settlement"], maximumPaymentBaseUnits: "1000" } as const;

describe("guarded transaction intents", () => {
  it("binds MPC approval and exact finalized receipt", () => {
    const planned = createTransactionIntent(input);
    const proposal = { proposalId: "proposal-1", policyId: "policy-0001", operation: "ai-settlement" as const, amountBaseUnits: "100", payloadDigest: planned.payloadDigest, expiresAt: input.expiresAt, approvals: ["alice", "bob"], status: "approved" as const };
    const authorized = authorizeTransactionIntent(planned, proposal, policy, "2026-08-06T12:10:00.000Z");
    const submitted = markTransactionSubmitted(authorized, "tx".repeat(32), "2026-08-06T12:20:00.000Z");
    const confirmed = confirmTransaction(submitted, { transactionId: "tx".repeat(32), from, to, amountBaseUnits: "100", reference: input.reference, finalized: true, success: true, observedAt: "2026-08-06T12:21:00.000Z" });
    expect(confirmed.status).toBe("confirmed");
    expect(() => confirmTransaction(submitted, { transactionId: "tx".repeat(32), from, to, amountBaseUnits: "101", reference: input.reference, finalized: true, success: true, observedAt: "2026-08-06T12:21:00.000Z" })).toThrow(/does not match/);
    expect(() => confirmTransaction(submitted, { transactionId: "wrong".repeat(16), from, to, amountBaseUnits: "100", reference: input.reference, finalized: true, success: false, observedAt: "2026-08-06T12:21:00.000Z" })).toThrow(/ID does not match/);
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
    const confirmed = { ...planned, status: "confirmed", transactionId: "tx".repeat(32), confirmedAt: "2026-08-06T12:21:00.000Z" } as const;
    const refundBase = { ...input, intentId: "refund-0000001", nonce: "refund-nonce-00001", reference: "refund-1", from: to, to: from, amountBaseUnits: "100", createdAt: "2026-08-06T12:30:00.000Z", expiresAt: "2026-08-06T13:30:00.000Z" };
    const first = createRefundIntent(confirmed, { ...refundBase, amountBaseUnits: "60" });
    expect(first.intent.kind).toBe("refund");
    expect(() => createRefundIntent(confirmed, { ...refundBase, intentId: "refund-0000002", nonce: "refund-nonce-00002", reference: "refund-2", amountBaseUnits: "41" }, [first])).toThrow(/cumulative/);
    expect(() => createRefundIntent(confirmed, { ...refundBase, amountBaseUnits: "101" })).toThrow(/exceeds/);
    expect(() => createRefundIntent(confirmed, { ...refundBase, assetId: Keypair.generate().publicKey.toBase58() })).toThrow(/asset/);
  });
});
