import { JARVIS_TOKEN } from "./token.ts";

export const JARVIS_MONETARY_POLICY = Object.freeze({
  supplyModel: "fixed",
  inflation: "none",
  canonicalIssuanceChain: "sui",
  maximumWholeSupply: JARVIS_TOKEN.maximumWholeSupply,
  maximumBaseUnits: JARVIS_TOKEN.maximumBaseUnits,
  decimals: JARVIS_TOKEN.decimals,
  canonicalMintingAfterGenesis: false,
  canonicalBurning: false,
  bridgedGenesisSupplyBaseUnits: 0n,
  bridgeRepresentationModel: "lock-mint-burn-release",
  bridgeAccounting: "exact-1:1",
} as const);
