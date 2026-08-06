import { z } from "zod";
import { assertChainNetwork, type JarvisChain } from "../utils/chains.js";

const nativeAmountSchema = z.string()
  .regex(/^(0|[1-9]\d*)$/, "native fee must be a canonical unsigned integer")
  .refine((value) => BigInt(value) <= 18_446_744_073_709_551_615n, "native fee exceeds uint64");

export const networkFeeQuoteSchema = z.object({
  quoteId: z.string().min(12),
  chain: z.enum(["sui", "solana"]),
  network: z.string().min(1),
  nativeAsset: z.enum(["SUI", "SOL"]),
  estimatedBaseUnits: nativeAmountSchema,
  maximumBaseUnits: nativeAmountSchema,
  quotedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((quote, context) => {
  try { assertChainNetwork(quote.chain, quote.network); } catch { context.addIssue({ code: "custom", path: ["network"], message: "fee network is invalid for chain" }); }
  const expectedAsset = quote.chain === "sui" ? "SUI" : "SOL";
  if (quote.nativeAsset !== expectedAsset) context.addIssue({ code: "custom", path: ["nativeAsset"], message: "native fee asset does not match chain" });
  if (BigInt(quote.estimatedBaseUnits) > BigInt(quote.maximumBaseUnits)) context.addIssue({ code: "custom", path: ["maximumBaseUnits"], message: "maximum network fee is below estimate" });
  if (Date.parse(quote.expiresAt) <= Date.parse(quote.quotedAt)) context.addIssue({ code: "custom", path: ["expiresAt"], message: "network fee quote expiry must follow quote time" });
});

export type NetworkFeeQuote = z.infer<typeof networkFeeQuoteSchema>;

export function validateNetworkFeeQuote(input: unknown, chain?: JarvisChain, network?: string): NetworkFeeQuote {
  const quote = networkFeeQuoteSchema.parse(input);
  if (chain !== undefined && quote.chain !== chain) throw new Error("network fee quote chain does not match transaction");
  if (network !== undefined && quote.network !== network) throw new Error("network fee quote network does not match transaction");
  return quote;
}

export function assertNetworkFeeAtMost(quote: NetworkFeeQuote, actualBaseUnits: string): void {
  const actual = nativeAmountSchema.parse(actualBaseUnits);
  if (BigInt(actual) > BigInt(quote.maximumBaseUnits)) throw new Error("actual network fee exceeds authorized maximum");
}
