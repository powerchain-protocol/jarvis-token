import assert from "node:assert/strict";
import test from "node:test";
import { calculateJarvisAiUsageQuote } from "../functions/ai-usage.ts";
import { createJarvisTokenizedChatRecord, markJarvisChatApprovalRequired } from "../functions/tokenized-chat.ts";
import { createJarvisAiSettlementQuote, isJarvisAiSettlementQuoteExpired, quoteMatchesJarvisAiUsage } from "../functions/ai-settlement.ts";

test("AI usage quotes use integer base units and round fractional text charges up", () => {
  const quote = calculateJarvisAiUsageQuote(
    { promptTokens: 1_500n, completionTokens: 500n, toolCalls: 2n },
    {
      promptPerMillionBaseUnits: 1_000_000n,
      completionPerMillionBaseUnits: 2_000_000n,
      cachedInputPerMillionBaseUnits: 0n,
      perToolCallBaseUnits: 10n,
      perImageUnitBaseUnits: 0n,
      perAudioSecondBaseUnits: 0n,
      perVideoSecondBaseUnits: 0n,
    },
  );
  assert.equal(quote.promptBaseUnits, 1_500n);
  assert.equal(quote.completionBaseUnits, 1_000n);
  assert.equal(quote.toolCallBaseUnits, 20n);
  assert.equal(quote.totalBaseUnits, 2_520n);
});

test("tokenized chat remains unquoted until a policy produces a quote", () => {
  const unquoted = createJarvisTokenizedChatRecord({ id: "r1", sessionId: "s1", messageId: "m1", createdAt: "2026-08-07T15:00:00.000Z" });
  assert.equal(unquoted.settlement, "unquoted");

  const quoted = createJarvisTokenizedChatRecord({ id: "r2", sessionId: "s1", messageId: "m2", createdAt: "2026-08-07T15:00:00.000Z", quotedBaseUnits: 100n });
  assert.equal(markJarvisChatApprovalRequired(quoted).settlement, "approval-required");
});


test("AI settlement quotes bind amount, usage, policy version, and expiry", () => {
  const usage = { promptTokens: 100n, completionTokens: 50n };
  const quote = createJarvisAiSettlementQuote({
    id: "q1", sessionId: "s1", messageId: "m1", amountBaseUnits: 42n,
    policyVersion: "2026-08-rc1", createdAt: "2026-08-07T15:00:00.000Z", ttlSeconds: 300, usage,
  });
  assert.equal(quote.amountBaseUnits, "42");
  assert.equal(quoteMatchesJarvisAiUsage(quote, usage), true);
  assert.equal(quoteMatchesJarvisAiUsage(quote, { promptTokens: 101n, completionTokens: 50n }), false);
  assert.equal(isJarvisAiSettlementQuoteExpired(quote, new Date("2026-08-07T15:04:59.000Z")), false);
  assert.equal(isJarvisAiSettlementQuoteExpired(quote, new Date("2026-08-07T15:05:00.000Z")), true);
});
