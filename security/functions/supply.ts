import { JARVIS_TOKEN } from "../constants/token.ts";

export interface JarvisSupplySnapshot {
  canonicalCirculatingBaseUnits: bigint;
  canonicalLockedBaseUnits: bigint;
  bridgedSolanaBaseUnits: bigint;
  /** Source Sui lock is final, destination Solana mint/claim is not final yet. */
  pendingSuiToSolanaBaseUnits?: bigint;
  /** Source Solana burn is final, destination Sui release/claim is not final yet. */
  pendingSolanaToSuiBaseUnits?: bigint;
}

export interface JarvisSupplyInvariantReport {
  canonicalTotalBaseUnits: bigint;
  expectedCanonicalTotalBaseUnits: bigint;
  expectedLockedBaseUnits: bigint;
  observedLockedBaseUnits: bigint;
  bridgeLiabilityBaseUnits: bigint;
  canonicalSupplyHealthy: boolean;
  reserveHealthy: boolean;
  healthy: boolean;
}

export function evaluateJarvisSupplyInvariant(snapshot: JarvisSupplySnapshot): JarvisSupplyInvariantReport {
  const pendingForward = snapshot.pendingSuiToSolanaBaseUnits ?? 0n;
  const pendingReverse = snapshot.pendingSolanaToSuiBaseUnits ?? 0n;
  const values = [
    snapshot.canonicalCirculatingBaseUnits,
    snapshot.canonicalLockedBaseUnits,
    snapshot.bridgedSolanaBaseUnits,
    pendingForward,
    pendingReverse,
  ];
  if (values.some((value) => value < 0n)) throw new RangeError("JARVIS supply values cannot be negative");

  const canonicalTotalBaseUnits = snapshot.canonicalCirculatingBaseUnits + snapshot.canonicalLockedBaseUnits;

  // Both classes of in-flight transfer remain liabilities against canonical custody:
  // - Sui→Solana: canonical JARVIS is already locked but bridged JARVIS is not minted yet.
  // - Solana→Sui: bridged JARVIS is already burned but canonical JARVIS is not released yet.
  const bridgeLiabilityBaseUnits = snapshot.bridgedSolanaBaseUnits + pendingForward + pendingReverse;
  const expectedLockedBaseUnits = bridgeLiabilityBaseUnits;
  const canonicalSupplyHealthy = canonicalTotalBaseUnits === JARVIS_TOKEN.maximumBaseUnits;
  const reserveHealthy = snapshot.canonicalLockedBaseUnits === expectedLockedBaseUnits;

  return {
    canonicalTotalBaseUnits,
    expectedCanonicalTotalBaseUnits: JARVIS_TOKEN.maximumBaseUnits,
    expectedLockedBaseUnits,
    observedLockedBaseUnits: snapshot.canonicalLockedBaseUnits,
    bridgeLiabilityBaseUnits,
    canonicalSupplyHealthy,
    reserveHealthy,
    healthy: canonicalSupplyHealthy && reserveHealthy,
  };
}

export function assertJarvisSupplyInvariant(snapshot: JarvisSupplySnapshot): void {
  const report = evaluateJarvisSupplyInvariant(snapshot);
  if (!report.canonicalSupplyHealthy) throw new Error("Canonical Sui JARVIS supply invariant failed");
  if (!report.reserveHealthy) throw new Error("JARVIS bridge reserve invariant failed");
}
