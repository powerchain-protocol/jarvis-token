import type { JarvisAiUsageBreakdown, JarvisAiUsageInput, JarvisAiUsagePricingPolicy } from "../common/ai.ts";

const MILLION = 1_000_000n;

function nonNegative(value: bigint | undefined, label: string): bigint {
  const next = value ?? 0n;
  if (next < 0n) throw new RangeError(`${label} cannot be negative`);
  return next;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError("denominator must be positive");
  if (numerator === 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

function textCost(tokens: bigint, ratePerMillion: bigint): bigint {
  if (ratePerMillion < 0n) throw new RangeError("AI usage rate cannot be negative");
  return ceilDiv(tokens * ratePerMillion, MILLION);
}

export function calculateJarvisAiUsageQuote(
  usage: JarvisAiUsageInput,
  policy: JarvisAiUsagePricingPolicy,
): JarvisAiUsageBreakdown {
  const promptTokens = nonNegative(usage.promptTokens, "promptTokens");
  const completionTokens = nonNegative(usage.completionTokens, "completionTokens");
  const cachedInputTokens = nonNegative(usage.cachedInputTokens, "cachedInputTokens");
  const toolCalls = nonNegative(usage.toolCalls, "toolCalls");
  const imageUnits = nonNegative(usage.imageUnits, "imageUnits");
  const audioSeconds = nonNegative(usage.audioSeconds, "audioSeconds");
  const videoSeconds = nonNegative(usage.videoSeconds, "videoSeconds");

  const promptBaseUnits = textCost(promptTokens, policy.promptPerMillionBaseUnits);
  const completionBaseUnits = textCost(completionTokens, policy.completionPerMillionBaseUnits);
  const cachedInputBaseUnits = textCost(cachedInputTokens, policy.cachedInputPerMillionBaseUnits);
  const toolCallBaseUnits = toolCalls * nonNegative(policy.perToolCallBaseUnits, "perToolCallBaseUnits");
  const imageBaseUnits = imageUnits * nonNegative(policy.perImageUnitBaseUnits, "perImageUnitBaseUnits");
  const audioBaseUnits = audioSeconds * nonNegative(policy.perAudioSecondBaseUnits, "perAudioSecondBaseUnits");
  const videoBaseUnits = videoSeconds * nonNegative(policy.perVideoSecondBaseUnits, "perVideoSecondBaseUnits");
  const totalBaseUnits = promptBaseUnits + completionBaseUnits + cachedInputBaseUnits + toolCallBaseUnits + imageBaseUnits + audioBaseUnits + videoBaseUnits;

  return {
    promptBaseUnits,
    completionBaseUnits,
    cachedInputBaseUnits,
    toolCallBaseUnits,
    imageBaseUnits,
    audioBaseUnits,
    videoBaseUnits,
    totalBaseUnits,
  };
}
