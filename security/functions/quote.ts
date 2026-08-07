import { JarvisTokenError } from "../common/errors.ts";
import { calculateFiatMinorUnits, type RateQuote } from "./rates.ts";

export interface JarvisEconomicQuote {
  amountBaseUnits: bigint;
  receiveBaseUnits: bigint;
  bridgeFeeBaseUnits: bigint;
  networkFee: { asset: "SUI" | "SOL"; baseUnits?: bigint; dynamic: true };
  marketValueMinorUnits?: bigint;
  marketCurrency?: string;
}

export function calculateJarvisEconomicQuote(input: {
  amountBaseUnits: bigint;
  destinationGasAsset: "SUI" | "SOL";
  estimatedNetworkFeeBaseUnits?: bigint;
  marketPrice?: RateQuote;
  currencyDecimals?: number;
}): JarvisEconomicQuote {
  if (input.amountBaseUnits <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Quote amount must be positive");
  if (input.estimatedNetworkFeeBaseUnits !== undefined && input.estimatedNetworkFeeBaseUnits < 0n) {
    throw new JarvisTokenError("INVALID_AMOUNT", "Network fee cannot be negative");
  }
  const quote: JarvisEconomicQuote = {
    amountBaseUnits: input.amountBaseUnits,
    receiveBaseUnits: input.amountBaseUnits,
    bridgeFeeBaseUnits: 0n,
    networkFee: {
      asset: input.destinationGasAsset,
      dynamic: true,
      ...(input.estimatedNetworkFeeBaseUnits !== undefined ? { baseUnits: input.estimatedNetworkFeeBaseUnits } : {}),
    },
  };
  if (input.marketPrice) {
    quote.marketValueMinorUnits = calculateFiatMinorUnits({
      tokenBaseUnits: input.amountBaseUnits,
      tokenDecimals: 6,
      rate: input.marketPrice.rate,
      currencyDecimals: input.currencyDecimals ?? 2,
    });
    quote.marketCurrency = input.marketPrice.quoteCurrency;
  }
  return quote;
}
