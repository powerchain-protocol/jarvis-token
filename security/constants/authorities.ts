export const JARVIS_AUTHORITY_POLICY = Object.freeze({
  sui: {
    canonicalMintingAfterGenesis: false,
    metadataMutableAfterGenesis: false,
    bridgeCustodyRequired: true,
  },
  solana: {
    independentMintingAllowed: false,
    genesisSupplyBaseUnits: 0n,
    freezeAuthorityAllowed: false,
    mintAuthorityOwner: "bridge-program-pda",
  },
} as const);
