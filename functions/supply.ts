import { JARVIS_TOKEN } from "../constants/token.ts";

export interface JarvisSupplySnapshot {
  canonicalCirculatingBaseUnits: bigint;
  canonicalLockedBaseUnits: bigint;
  bridgedSolanaBaseUnits: bigint;
  pendingSuiToSolanaBaseUnits?: bigint;
  pendingSolanaToSuiBaseUnits?: bigint;
}

export function assertJarvisSupplyInvariant(snapshot: JarvisSupplySnapshot): void {
  const pendingForward = snapshot.pendingSuiToSolanaBaseUnits ?? 0n;
  const pendingReverse = snapshot.pendingSolanaToSuiBaseUnits ?? 0n;
  for (const value of Object.values(snapshot)) if (value !== undefined && value < 0n) throw new Error("JARVIS supply values cannot be negative");
  if (snapshot.canonicalCirculatingBaseUnits + snapshot.canonicalLockedBaseUnits !== JARVIS_TOKEN.maximumBaseUnits) {
    throw new Error("Canonical Sui JARVIS supply invariant failed");
  }
  const expectedLocked = snapshot.bridgedSolanaBaseUnits + pendingForward - pendingReverse;
  if (snapshot.canonicalLockedBaseUnits !== expectedLocked) throw new Error("JARVIS bridge reserve invariant failed");
}
