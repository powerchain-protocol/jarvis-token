export const JARVIS_NETWORKS = Object.freeze({
  testnet: {
    sui: "testnet",
    solana: "devnet",
  },
  mainnet: {
    sui: "mainnet",
    solana: "mainnet-beta",
  },
} as const);

export const JARVIS_ROUTE_IDS = Object.freeze({
  suiToSolana: "jarvis:sui:solana:wormhole-ntt",
  solanaToSui: "jarvis:solana:sui:wormhole-ntt",
} as const);
