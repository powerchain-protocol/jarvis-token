import type { PricePolicy, PriceProvider, PriceResolution } from "../functions/price.ts";
import { resolveFreshPrice } from "../functions/price.ts";
import { calculateFiatMinorUnits, type RateQuote } from "../functions/rates.ts";

export class JarvisPricingService {
  private readonly providers: readonly PriceProvider[];
  private readonly policy: PricePolicy;
  constructor(providers: readonly PriceProvider[], policy: PricePolicy = {}) {
    this.providers = providers;
    this.policy = policy;
  }

  price(currency = "USD", now = Date.now()): Promise<PriceResolution> {
    return resolveFreshPrice(this.providers, "jarvis", currency, now, this.policy);
  }

  valueMinorUnits(amountBaseUnits: bigint, quote: RateQuote, currencyDecimals = 2): bigint {
    return calculateFiatMinorUnits({
      tokenBaseUnits: amountBaseUnits,
      tokenDecimals: 6,
      rate: quote.rate,
      currencyDecimals,
    });
  }
}
