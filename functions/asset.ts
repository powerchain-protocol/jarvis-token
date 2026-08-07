import type { CanonicalAsset } from "../common/types.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";
import { JARVIS_ROUTE_IDS } from "../constants/networks.ts";

export function createJarvisCanonicalAsset(input: {
  suiCoinType?: string;
  solanaMint?: string;
  verification?: "deployment-gated" | "verified" | "disabled";
} = {}): CanonicalAsset {
  return {
    id: "jarvis",
    canonicalId: "jarvis",
    symbol: "JARVIS",
    name: "JARVIS",
    canonicalChain: "sui",
    decimals: JARVIS_TOKEN.decimals,
    representations: [
      { chain: "sui", type: "canonical", standard: "Sui Coin", ...(input.suiCoinType ? { address: input.suiCoinType } : {}), addressEnv: "JARVIS_SUI_COIN_TYPE" },
      { chain: "solana", type: "bridged", standard: "Token-2022", provider: "wormhole", ...(input.solanaMint ? { address: input.solanaMint } : {}), addressEnv: "WRAPPED_JARVIS_SOLANA_MINT" },
    ],
    metadata: {
      description: "JARVIS is the canonical utility asset of the JARVIS platform. Supply originates on Sui and is represented on Solana through Wormhole NTT.",
      icon: "assets/jarvis-green.png",
      tags: ["platform", "canonical", "bridge"],
      documentation: "README.md",
    },
    verification: {
      status: input.verification ?? "deployment-gated",
      requiresVerifiedRepresentations: true,
    },
    analytics: { source: "asset-intelligence", persistSnapshots: true },
    bridgeSupport: {
      provider: "wormhole",
      protocol: "ntt",
      routes: [JARVIS_ROUTE_IDS.suiToSolana, JARVIS_ROUTE_IDS.solanaToSui],
      exactOneToOne: true,
    },
  };
}
