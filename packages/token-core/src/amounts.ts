import { z } from "zod";
import { TOKEN } from "./constants.js";

/** Canonical unsigned JARVIS base-unit amount bounded by the fixed supply. */
export const jarvisAmountSchema = z.string()
  .regex(/^(0|[1-9]\d*)$/, "amount must be a canonical unsigned integer")
  .refine((value) => BigInt(value) <= TOKEN.maximumBaseUnits, "amount exceeds JARVIS maximum supply");

/** A non-zero JARVIS amount for operations that cannot be no-ops. */
export const positiveJarvisAmountSchema = jarvisAmountSchema
  .refine((value) => BigInt(value) > 0n, "amount must be positive");

export function parseJarvisBaseUnits(value: string): bigint {
  return BigInt(jarvisAmountSchema.parse(value));
}

/** Parses a human JARVIS amount without floating point or exponent notation. */
export function parseJarvisDecimal(value: string): bigint {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) throw new Error("JARVIS amount must be a canonical decimal with at most 6 fractional digits");
  const whole = BigInt(match[1]!);
  const fraction = BigInt((match[2] ?? "").padEnd(TOKEN.decimals, "0") || "0");
  const result = whole * 10n ** BigInt(TOKEN.decimals) + fraction;
  jarvisAmountSchema.parse(result.toString());
  return result;
}

export function formatJarvisBaseUnits(value: string | bigint, trimTrailingZeros = true): string {
  const amount = typeof value === "bigint" ? parseJarvisBaseUnits(value.toString()) : parseJarvisBaseUnits(value);
  const scale = 10n ** BigInt(TOKEN.decimals);
  const whole = amount / scale;
  let fraction = (amount % scale).toString().padStart(TOKEN.decimals, "0");
  if (trimTrailingZeros) fraction = fraction.replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function addJarvisBaseUnits(left: string | bigint, right: string | bigint): bigint {
  const result = parseJarvisBaseUnits(left.toString()) + parseJarvisBaseUnits(right.toString());
  jarvisAmountSchema.parse(result.toString());
  return result;
}

export function subtractJarvisBaseUnits(left: string | bigint, right: string | bigint): bigint {
  const result = parseJarvisBaseUnits(left.toString()) - parseJarvisBaseUnits(right.toString());
  if (result < 0n) throw new Error("JARVIS subtraction would produce a negative amount");
  return result;
}
