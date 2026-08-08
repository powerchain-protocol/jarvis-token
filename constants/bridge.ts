import { JARVIS_TOKEN } from "./token.ts";

export const JARVIS_BRIDGE_POLICY = Object.freeze({
  provider: "wormhole",
  protocol: "ntt",
  canonicalChain: "sui",
  canonicalMode: "lock-release",
  bridgedChain: "solana",
  bridgedMode: "mint-burn",
  exactOneToOne: true,
  manualClaimDefault: true,
  wormholeChainIds: Object.freeze({ solana: 1, sui: 21 }),
  maximumBaseUnits: JARVIS_TOKEN.maximumBaseUnits,
  bridgedGenesisSupplyBaseUnits: 0n,
} as const);
