export type JarvisChain = "sui" | "solana";
export type JarvisEnvironment = "testnet" | "mainnet";
export type RepresentationType = "canonical" | "bridged";
export type VerificationStatus = "deployment-gated" | "verified" | "disabled";

export interface AssetMetadata {
  description: string;
  icon: string;
  tags: readonly string[];
  documentation?: string;
}

export interface AssetAnalytics {
  source: "asset-intelligence";
  persistSnapshots: boolean;
}

export interface AssetRepresentation {
  chain: JarvisChain;
  type: RepresentationType;
  standard: "Sui Coin" | "Token-2022";
  address?: string;
  addressEnv: string;
  provider?: "wormhole";
}

export interface AssetBridgeSupport {
  provider: "wormhole";
  protocol: "ntt";
  routes: readonly ["jarvis:sui:solana:wormhole-ntt", "jarvis:solana:sui:wormhole-ntt"];
  exactOneToOne: true;
}

export interface CanonicalAsset {
  id: "jarvis";
  canonicalId: "jarvis";
  symbol: "JARVIS";
  name: "JARVIS";
  canonicalChain: "sui";
  decimals: 6;
  representations: readonly AssetRepresentation[];
  metadata: AssetMetadata;
  verification: {
    status: VerificationStatus;
    requiresVerifiedRepresentations: true;
  };
  analytics: AssetAnalytics;
  bridgeSupport: AssetBridgeSupport;
}
