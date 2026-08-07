import { JarvisTokenError } from "../common/errors.ts";

export interface RateQuote {
  baseAssetId: string;
  quoteCurrency: string;
  /** Decimal string; never a JS floating-point value. */
  rate: string;
  source: string;
  observedAt: string;
  expiresAt: string;
}

export function parseRateToScale(rate: string, scale = 8): bigint {
  if (!Number.isInteger(scale) || scale < 0 || scale > 18) throw new JarvisTokenError("INVALID_AMOUNT", "Rate scale must be between 0 and 18");
  const match = /^(\d+)(?:\.(\d+))?$/.exec(rate.trim());
  if (!match) throw new JarvisTokenError("INVALID_AMOUNT", "Rate must be a positive decimal string");
  const fraction = match[2] ?? "";
  if (fraction.length > scale) throw new JarvisTokenError("INVALID_AMOUNT", `Rate supports at most ${scale} fractional digits`);
  const whole = match[1];
  if (whole === undefined) throw new JarvisTokenError("INVALID_AMOUNT", "Rate must include a whole-number component");
  const scaled = BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0") || "0");
  if (scaled <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Rate must be positive");
  return scaled;
}

export function assertRateFresh(quote: RateQuote, now = Date.now()): void {
  const observed = Date.parse(quote.observedAt);
  const expires = Date.parse(quote.expiresAt);
  if (!Number.isFinite(observed) || !Number.isFinite(expires) || expires <= observed) {
    throw new JarvisTokenError("INVALID_ASSET", "Rate quote timestamps are invalid");
  }
  if (expires <= now) throw new JarvisTokenError("NOT_VERIFIED", "Rate quote has expired");
}

export function calculateFiatMinorUnits(input: {
  tokenBaseUnits: bigint;
  tokenDecimals: number;
  rate: string;
  currencyDecimals?: number;
  rateScale?: number;
}): bigint {
  const currencyDecimals = input.currencyDecimals ?? 2;
  const rateScale = input.rateScale ?? 8;
  if (input.tokenBaseUnits < 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Token amount cannot be negative");
  const scaledRate = parseRateToScale(input.rate, rateScale);
  const numerator = input.tokenBaseUnits * scaledRate * 10n ** BigInt(currencyDecimals);
  const denominator = 10n ** BigInt(input.tokenDecimals + rateScale);
  return numerator / denominator;
}
