import type { JarvisAiUsageInput } from "../common/ai.ts";

export interface JarvisAiSettlementQuote {
  id: string;
  sessionId: string;
  messageId: string;
  network: "sui" | "solana";
  amountBaseUnits: string;
  policyVersion: string;
  createdAt: string;
  expiresAt: string;
  usageHash: string;
}

function canonicalUsage(usage: JarvisAiUsageInput): string {
  return [
    usage.promptTokens ?? 0n,
    usage.completionTokens ?? 0n,
    usage.cachedInputTokens ?? 0n,
    usage.toolCalls ?? 0n,
    usage.imageUnits ?? 0n,
    usage.audioSeconds ?? 0n,
    usage.videoSeconds ?? 0n,
  ].map(String).join(":");
}

export function hashJarvisAiUsage(usage: JarvisAiUsageInput): string {
  // Stable FNV-1a 64-bit fingerprint for runtime-neutral integrity binding.
  // This is not an authorization signature; production settlement must be wallet/server signed.
  let hash = 0xcbf29ce484222325n;
  for (const char of canonicalUsage(usage)) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export function createJarvisAiSettlementQuote(input: {
  id: string;
  sessionId: string;
  messageId: string;
  network?: "sui" | "solana";
  amountBaseUnits: bigint;
  policyVersion: string;
  createdAt: string;
  ttlSeconds: number;
  usage: JarvisAiUsageInput;
}): JarvisAiSettlementQuote {
  if (!input.id.trim() || !input.sessionId.trim() || !input.messageId.trim()) throw new TypeError("quote identity fields are required");
  if (input.amountBaseUnits < 0n) throw new RangeError("amountBaseUnits cannot be negative");
  if (!input.policyVersion.trim()) throw new TypeError("policyVersion is required");
  if (!Number.isInteger(input.ttlSeconds) || input.ttlSeconds < 1 || input.ttlSeconds > 3600) throw new RangeError("ttlSeconds must be between 1 and 3600");
  const createdMs = Date.parse(input.createdAt);
  if (!Number.isFinite(createdMs)) throw new TypeError("createdAt must be an ISO-compatible timestamp");

  return {
    id: input.id,
    sessionId: input.sessionId,
    messageId: input.messageId,
    network: input.network ?? "sui",
    amountBaseUnits: input.amountBaseUnits.toString(),
    policyVersion: input.policyVersion,
    createdAt: new Date(createdMs).toISOString(),
    expiresAt: new Date(createdMs + input.ttlSeconds * 1000).toISOString(),
    usageHash: hashJarvisAiUsage(input.usage),
  };
}

export function isJarvisAiSettlementQuoteExpired(quote: JarvisAiSettlementQuote, now = new Date()): boolean {
  return now.getTime() >= Date.parse(quote.expiresAt);
}

export function quoteMatchesJarvisAiUsage(quote: JarvisAiSettlementQuote, usage: JarvisAiUsageInput): boolean {
  return hashJarvisAiUsage(usage) === quote.usageHash;
}
