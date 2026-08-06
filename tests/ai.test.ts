import { describe, expect, it } from "vitest";
import { cancelAiReservation, createAiLedger, createTokenizedChatSession, recordTokenizedChatTurn, reserveAiUsage, settleAiUsage } from "../packages/token-core/src/ai/ledger.js";
import { approveMpcProposal, createMpcProposal } from "../packages/token-core/src/ai/mpc.js";
import { quoteAiUsage } from "../packages/token-core/src/ai/pricing.js";

const schedule = {
  scheduleId: "schedule-v1", provider: "provider-a", model: "llm-a", effectiveAt: "2026-01-01T00:00:00.000Z",
  ratesBaseUnits: { inputPerMillionTokens: "1000000", outputPerMillionTokens: "2000000", perImage: "50", perAudioSecond: "2", perVideoSecond: "10", perComputeSecond: "4", perGigabyteHour: "3" },
};

describe("JARVIS AI utility", () => {
  it("quotes multi-modal usage using integer base units", () => {
    const quote = quoteAiUsage({ inputTokens: 1, outputTokens: 1, images: 2, computeMilliseconds: 1 }, schedule, "2026-08-06T12:00:00.000Z");
    expect(quote.totalBaseUnits).toBe("104");
    expect(quote.asset).toBe("JARVIS");
    expect(() => quoteAiUsage({ inputTokens: Number.MAX_SAFE_INTEGER + 1 }, schedule, "2026-08-06T12:00:00.000Z")).toThrow();
    expect(() => quoteAiUsage({ images: 2 }, { ...schedule, ratesBaseUnits: { ...schedule.ratesBaseUnits, perImage: "18440000000000000" } }, "2026-08-06T12:00:00.000Z")).toThrow(/maximum supply/);
    expect(() => quoteAiUsage({}, { ...schedule, ratesBaseUnits: { ...schedule.ratesBaseUnits, perImage: "18440000000000001" } }, "2026-08-06T12:00:00.000Z")).toThrow(/maximum supply/);
  });

  it("reserves, settles, refunds, and rejects idempotency conflicts", () => {
    const ledger = createAiLedger("account-1", "1000");
    const reserved = reserveAiUsage(ledger, { reservationId: "reserve-1", idempotencyKey: "request-1", sessionId: "session-1", amountBaseUnits: "200" });
    expect(reserveAiUsage(reserved, { reservationId: "reserve-1", idempotencyKey: "request-1", sessionId: "session-1", amountBaseUnits: "200" })).toBe(reserved);
    expect(() => reserveAiUsage(reserved, { reservationId: "reserve-2", idempotencyKey: "request-1", sessionId: "session-1", amountBaseUnits: "300" })).toThrow(/conflict/);
    const settled = settleAiUsage(reserved, "reserve-1", "150");
    expect(settled.balanceBaseUnits).toBe("850");
    expect(settleAiUsage(settled, "reserve-1", "150")).toBe(settled);
    expect(() => settleAiUsage(settled, "reserve-1", "149")).toThrow(/idempotency conflict/);
    const cancelled = cancelAiReservation(reserved, "reserve-1");
    expect(cancelled.balanceBaseUnits).toBe("1000");
    expect(cancelAiReservation(cancelled, "reserve-1")).toBe(cancelled);
    expect(() => settleAiUsage(reserved, "reserve-1", "201")).toThrow(/exceeds/);
    expect(() => reserveAiUsage({ ...reserved, reservations: [...reserved.reservations, reserved.reservations[0]!] }, { reservationId: "reserve-3", idempotencyKey: "request-3", sessionId: "session-3", amountBaseUnits: "1" })).toThrow(/duplicate persisted/);
    expect(() => createAiLedger("account-1", "18440000000000001")).toThrow(/maximum supply/);
    expect(() => createAiLedger("account-1", "01")).toThrow(/canonical/);
  });

  it("enforces tokenized chat and agent budgets without storing prompts", () => {
    const session = createTokenizedChatSession({ sessionId: "session-1", owner: "user-1", agentId: "agent-1", budgetBaseUnits: "100" });
    const updated = recordTokenizedChatTurn(session, { turnId: "turn-0001", contentDigest: "d".repeat(64), chargeBaseUnits: "80" });
    expect(updated.spentBaseUnits).toBe("80");
    expect(() => recordTokenizedChatTurn(updated, { turnId: "turn-0002", contentDigest: "e".repeat(64), chargeBaseUnits: "21" })).toThrow(/budget/);
    expect(() => recordTokenizedChatTurn({ ...updated, spentBaseUnits: "79" }, { turnId: "turn-0002", contentDigest: "e".repeat(64), chargeBaseUnits: "1" })).toThrow(/does not match/);
    expect(() => createTokenizedChatSession({ sessionId: "session-2", owner: "user-1", budgetBaseUnits: "18440000000000001" })).toThrow(/maximum supply/);
  });

  it("requires unique MPC threshold approval and policy limits", () => {
    const policy = { policyId: "mpc-policy-1", participants: ["alice", "bob", "carol"], threshold: 2, allowedOperations: ["ai-settlement"], maximumPaymentBaseUnits: "1000" } as const;
    const proposal = createMpcProposal({ proposalId: "proposal-1", policyId: policy.policyId, operation: "ai-settlement", amountBaseUnits: "500", payloadDigest: "p".repeat(64), expiresAt: "2026-08-07T00:00:00.000Z" }, policy, "2026-08-06T12:00:00.000Z");
    const one = approveMpcProposal(proposal, "alice", policy, "2026-08-06T12:01:00.000Z");
    expect(one.status).toBe("pending");
    expect(approveMpcProposal(one, "bob", policy, "2026-08-06T12:02:00.000Z").status).toBe("approved");
    expect(() => approveMpcProposal(one, "alice", policy, "2026-08-06T12:03:00.000Z")).toThrow(/duplicate/);
    expect(() => approveMpcProposal({ ...proposal, approvals: ["mallory"] }, "alice", policy, "2026-08-06T12:03:00.000Z")).toThrow(/unknown persisted/);
    expect(() => createMpcProposal({ ...proposal, amountBaseUnits: "0" }, policy, "2026-08-06T12:00:00.000Z")).toThrow(/positive/);
    expect(() => createMpcProposal({ ...proposal, amountBaseUnits: "18440000000000001" }, { ...policy, maximumPaymentBaseUnits: "18440000000000000" }, "2026-08-06T12:00:00.000Z")).toThrow(/maximum supply/);
  });
});
