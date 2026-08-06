import { z } from "zod";
import { assertChainNetwork, type JarvisChain } from "./utils/chains.js";
import { sha256CanonicalJson } from "./utils/canonical-json.js";

const uint64String = z.string().regex(/^(0|[1-9]\d*)$/).refine((value) => BigInt(value) <= 18_446_744_073_709_551_615n, "block height exceeds uint64");
const base58BlockHash = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{40,50}$/, "invalid block hash or checkpoint digest");

export const blockFinalityAnchorSchema = z.object({
  chain: z.enum(["sui", "solana"]),
  network: z.string().min(1),
  blockHeight: uint64String,
  blockHash: base58BlockHash,
  finality: z.literal("finalized"),
}).superRefine((anchor, context) => {
  try { assertChainNetwork(anchor.chain, anchor.network); }
  catch { context.addIssue({ code: "custom", path: ["network"], message: "block network is invalid for chain" }); }
});

export type BlockFinalityAnchor = z.infer<typeof blockFinalityAnchorSchema>;

export function validateBlockFinalityAnchor(input: unknown, chain?: JarvisChain, network?: string): BlockFinalityAnchor {
  const anchor = blockFinalityAnchorSchema.parse(input);
  if (chain !== undefined && anchor.chain !== chain) throw new Error("block anchor chain does not match transaction");
  if (network !== undefined && anchor.network !== network) throw new Error("block anchor network does not match transaction");
  return anchor;
}

export function digestBlockFinalityAnchor(input: unknown): string {
  return sha256CanonicalJson(validateBlockFinalityAnchor(input));
}
