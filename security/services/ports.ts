import type { JarvisChain, JarvisEnvironment } from "../common/types.ts";

export interface TokenChainObservation {
  chain: JarvisChain;
  environment: JarvisEnvironment;
  identity: string;
  decimals: number;
  totalSupplyBaseUnits: bigint;
  observedAt: string;
  source: string;
  freezeAuthority?: string | null;
}

export interface TokenReserveObservation {
  environment: JarvisEnvironment;
  lockedCanonicalBaseUnits: bigint;
  pendingInboundBaseUnits?: bigint;
  pendingOutboundBaseUnits?: bigint;
  observedAt: string;
  source: string;
}

export interface TokenObservationProvider {
  observeSui(): Promise<TokenChainObservation>;
  observeSolana(): Promise<TokenChainObservation>;
  observeReserve(): Promise<TokenReserveObservation>;
}

export interface TokenObservationSnapshot {
  id: string;
  observedAt: string;
  sui: TokenChainObservation;
  solana: TokenChainObservation;
  reserve: TokenReserveObservation;
}
