import { JarvisTokenError } from "../common/errors.ts";

export interface SolanaAuthoritySnapshot {
  mintAuthority: string | null;
  expectedMintAuthority: string;
  freezeAuthority: string | null;
  supplyBaseUnits: bigint;
  expectedGenesis: boolean;
}

export function assertSolanaAuthorityPolicy(snapshot: SolanaAuthoritySnapshot): void {
  if (snapshot.mintAuthority !== snapshot.expectedMintAuthority) {
    throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Solana JARVIS mint authority is not owned by the approved bridge authority");
  }
  if (snapshot.freezeAuthority !== null) {
    throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Solana JARVIS freeze authority must be disabled");
  }
  if (snapshot.expectedGenesis && snapshot.supplyBaseUnits !== 0n) {
    throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Solana bridged JARVIS must start with zero genesis supply");
  }
}
