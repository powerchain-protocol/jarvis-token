import { z } from "zod";
import { jarvisAmountSchema } from "../amounts.js";
import { TOKEN } from "../constants.js";

const units = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const usageInteger = z.string().regex(/^(0|[1-9]\d*)$/).max(30);

export const aiUsageSchema = z.object({
  inputTokens: units.default(0), outputTokens: units.default(0), images: units.default(0),
  audioSeconds: units.default(0), videoSeconds: units.default(0), computeMilliseconds: units.default(0),
  storageByteHours: usageInteger.default("0"),
});

export const aiPriceScheduleSchema = z.object({
  scheduleId: z.string().min(8), provider: z.string().min(1), model: z.string().min(1),
  effectiveAt: z.iso.datetime(), expiresAt: z.iso.datetime().optional(),
  ratesBaseUnits: z.object({
    inputPerMillionTokens: jarvisAmountSchema, outputPerMillionTokens: jarvisAmountSchema, perImage: jarvisAmountSchema,
    perAudioSecond: jarvisAmountSchema, perVideoSecond: jarvisAmountSchema, perComputeSecond: jarvisAmountSchema,
    perGigabyteHour: jarvisAmountSchema,
  }),
}).superRefine((schedule, context) => {
  if (schedule.expiresAt && Date.parse(schedule.expiresAt) <= Date.parse(schedule.effectiveAt)) context.addIssue({ code: "custom", path: ["expiresAt"], message: "price schedule expiry must follow its effective time" });
});

const ceilDiv = (value: bigint, divisor: bigint) => value === 0n ? 0n : (value + divisor - 1n) / divisor;

export function quoteAiUsage(usageInput: unknown, scheduleInput: unknown, quotedAt: string) {
  const usage = aiUsageSchema.parse(usageInput);
  const schedule = aiPriceScheduleSchema.parse(scheduleInput);
  z.iso.datetime().parse(quotedAt);
  const at = Date.parse(quotedAt);
  if (at < Date.parse(schedule.effectiveAt)) throw new Error("price schedule is not yet effective");
  if (schedule.expiresAt && at >= Date.parse(schedule.expiresAt)) throw new Error("price schedule has expired");
  const rates = schedule.ratesBaseUnits;
  const components = {
    inputTokens: ceilDiv(BigInt(usage.inputTokens) * BigInt(rates.inputPerMillionTokens), 1_000_000n),
    outputTokens: ceilDiv(BigInt(usage.outputTokens) * BigInt(rates.outputPerMillionTokens), 1_000_000n),
    images: BigInt(usage.images) * BigInt(rates.perImage),
    audio: BigInt(usage.audioSeconds) * BigInt(rates.perAudioSecond),
    video: BigInt(usage.videoSeconds) * BigInt(rates.perVideoSecond),
    compute: ceilDiv(BigInt(usage.computeMilliseconds) * BigInt(rates.perComputeSecond), 1_000n),
    storage: ceilDiv(BigInt(usage.storageByteHours) * BigInt(rates.perGigabyteHour), 1_000_000_000n),
  };
  const total = Object.values(components).reduce((sum, value) => sum + value, 0n);
  if (total > TOKEN.maximumBaseUnits) throw new Error("AI quote exceeds JARVIS maximum supply");
  return {
    scheduleId: schedule.scheduleId, provider: schedule.provider, model: schedule.model,
    quotedAt, usage, componentsBaseUnits: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, value.toString()])),
    totalBaseUnits: total.toString(), asset: "JARVIS", decimals: 6,
  };
}
