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
  // Wormhole chain/domain identifiers. These are protocol identifiers, not RPC chain IDs.
  wormholeChainIds: Object.freeze({
    solana: 1,
    sui: 21,
  }),
  maximumBaseUnits: JARVIS_TOKEN.maximumBaseUnits,
  bridgedGenesisSupplyBaseUnits: 0n,
  // Operational deployment default, intentionally below the monetary maximum.
  // Governance/deployment policy may choose a lower value.
  recommendedMaxTransferBaseUnits: 184_400_000_000_000n,
} as const);

export function assertBridgeTransferAmount(amount: bigint, maxTransferBaseUnits = JARVIS_BRIDGE_POLICY.recommendedMaxTransferBaseUnits): void {
  if (amount <= 0n) throw new RangeError("JARVIS bridge transfer amount must be positive");
  if (maxTransferBaseUnits <= 0n || maxTransferBaseUnits > JARVIS_TOKEN.maximumBaseUnits) {
    throw new RangeError("JARVIS bridge transfer limit is outside the monetary policy");
  }
  if (amount > maxTransferBaseUnits) throw new RangeError("JARVIS bridge transfer exceeds the configured per-transfer limit");
}
