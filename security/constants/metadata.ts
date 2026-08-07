export const JARVIS_METADATA = Object.freeze({
  description: "JARVIS is the fixed-supply utility and accounting asset of the JARVIS platform. Canonical supply originates on Sui and its official Solana representation is bridge-backed through Wormhole NTT.",
  canonicalIcon: "assets/jarvis-green.png",
  darkIcon: "assets/jarvis-logo-dark.png",
  lightIcon: "assets/jarvis-logo-light.png",
  tags: ["platform", "canonical", "cross-chain", "wormhole", "token-2022"] as const,
  displayPolicy: "retain-ticker-with-representation-badge",
} as const);
