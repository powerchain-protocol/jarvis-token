import type { RateQuote } from "./rates.ts";
import { assertRateFresh, parseRateToScale } from "./rates.ts";

export interface PriceProvider {
  id: string;
  get(assetId: string, quoteCurrency: string): Promise<RateQuote | null>;
}

export interface PriceResolution {
  quote: RateQuote | null;
  attemptedProviders: readonly string[];
  validProviders: readonly string[];
  confidence: "unavailable" | "single-source" | "consensus";
  maxDeviationBps?: number;
}

export interface PricePolicy {
  minimumSources?: number;
  maximumDeviationBps?: number;
  rateScale?: number;
}

function deviationBps(value: bigint, reference: bigint): bigint {
  if (reference <= 0n) return 10_000n;
  const diff = value >= reference ? value - reference : reference - value;
  return diff * 10_000n / reference;
}

export async function resolveFreshPrice(
  providers: readonly PriceProvider[],
  assetId: string,
  quoteCurrency = "USD",
  now = Date.now(),
  policy: PricePolicy = {},
): Promise<PriceResolution> {
  const attempted: string[] = [];
  const valid: Array<{ provider: string; quote: RateQuote; scaled: bigint }> = [];
  const scale = policy.rateScale ?? 8;

  for (const provider of providers) {
    attempted.push(provider.id);
    try {
      const quote = await provider.get(assetId, quoteCurrency);
      if (!quote) continue;
      assertRateFresh(quote, now);
      valid.push({ provider: provider.id, quote, scaled: parseRateToScale(quote.rate, scale) });
    } catch {
      // Isolate provider failure/staleness. No fabricated fallback price.
    }
  }

  if (valid.length === 0) return { quote: null, attemptedProviders: attempted, validProviders: [], confidence: "unavailable" };
  valid.sort((a, b) => a.scaled < b.scaled ? -1 : a.scaled > b.scaled ? 1 : 0);
  const median = valid[Math.floor((valid.length - 1) / 2)]!;
  let maxDeviation = 0n;
  for (const item of valid) {
    const d = deviationBps(item.scaled, median.scaled);
    if (d > maxDeviation) maxDeviation = d;
  }

  const minimumSources = policy.minimumSources ?? 1;
  const maximumDeviationBps = policy.maximumDeviationBps ?? 500;
  if (valid.length < minimumSources || maxDeviation > BigInt(maximumDeviationBps)) {
    return {
      quote: null,
      attemptedProviders: attempted,
      validProviders: valid.map((x) => x.provider),
      confidence: "unavailable",
      maxDeviationBps: Number(maxDeviation),
    };
  }

  return {
    quote: median.quote,
    attemptedProviders: attempted,
    validProviders: valid.map((x) => x.provider),
    confidence: valid.length >= 2 ? "consensus" : "single-source",
    maxDeviationBps: Number(maxDeviation),
  };
}
