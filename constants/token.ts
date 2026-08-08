import { JARVIS_TOKEN_VERSION } from "./version.ts";

export const JARVIS_TOKEN = Object.freeze({
  id: "jarvis",
  canonicalId: "jarvis",
  name: "JARVIS",
  symbol: "JARVIS",
  version: JARVIS_TOKEN_VERSION,
  decimals: 6,
  maximumWholeSupply: 20_000_000_000n,
  maximumBaseUnits: 20_000_000_000_000_000n,
  canonicalChain: "sui",
  bridgedChain: "solana",
  bridgeProvider: "wormhole",
  supplyModel: "fixed",
  displayTicker: "JARVIS",
} as const);

export const JARVIS_SUPPLY_SCALE = 10n ** BigInt(JARVIS_TOKEN.decimals);

export const SUI_U64_MAX = (1n << 64n) - 1n;
export const JARVIS_SUPPLY_HEADROOM_BASE_UNITS = SUI_U64_MAX - JARVIS_TOKEN.maximumBaseUnits;

if (JARVIS_TOKEN.maximumWholeSupply * JARVIS_SUPPLY_SCALE !== JARVIS_TOKEN.maximumBaseUnits) {
  throw new Error("JARVIS token supply constants are inconsistent");
}

if (JARVIS_TOKEN.maximumBaseUnits > SUI_U64_MAX) {
  throw new Error("JARVIS canonical supply exceeds Sui u64 accounting capacity");
}
