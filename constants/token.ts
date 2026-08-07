import { JARVIS_TOKEN_VERSION } from "./version.ts";

export const JARVIS_TOKEN = Object.freeze({
  id: "jarvis",
  canonicalId: "jarvis",
  name: "JARVIS",
  symbol: "JARVIS",
  version: JARVIS_TOKEN_VERSION,
  decimals: 6,
  maximumWholeSupply: 18_440_000_000n,
  maximumBaseUnits: 18_440_000_000_000_000n,
  canonicalChain: "sui",
  bridgedChain: "solana",
  bridgeProvider: "wormhole",
  supplyModel: "fixed",
  displayTicker: "JARVIS",
} as const);

export const JARVIS_SUPPLY_SCALE = 10n ** BigInt(JARVIS_TOKEN.decimals);

if (JARVIS_TOKEN.maximumWholeSupply * JARVIS_SUPPLY_SCALE !== JARVIS_TOKEN.maximumBaseUnits) {
  throw new Error("JARVIS token supply constants are inconsistent");
}
