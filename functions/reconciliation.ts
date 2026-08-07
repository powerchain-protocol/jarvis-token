import { JarvisTokenError } from "../common/errors.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";
import type { JarvisSupplySnapshot } from "./supply.ts";
import { assertJarvisSupplyInvariant } from "./supply.ts";

export type ReconciliationState = "balanced" | "pending" | "invalid";

export interface ReconciliationReport {
  state: ReconciliationState;
  canonicalTotalBaseUnits: bigint;
  lockedBaseUnits: bigint;
  representedBaseUnits: bigint;
  pendingForwardBaseUnits: bigint;
  pendingReverseBaseUnits: bigint;
  reserveDeltaBaseUnits: bigint;
}

export function reconcileJarvisSupply(snapshot: JarvisSupplySnapshot): ReconciliationReport {
  const pendingForwardBaseUnits = snapshot.pendingSuiToSolanaBaseUnits ?? 0n;
  const pendingReverseBaseUnits = snapshot.pendingSolanaToSuiBaseUnits ?? 0n;
  const representedBaseUnits = snapshot.bridgedSolanaBaseUnits + pendingForwardBaseUnits - pendingReverseBaseUnits;
  const canonicalTotalBaseUnits = snapshot.canonicalCirculatingBaseUnits + snapshot.canonicalLockedBaseUnits;
  const reserveDeltaBaseUnits = snapshot.canonicalLockedBaseUnits - representedBaseUnits;

  try {
    assertJarvisSupplyInvariant(snapshot);
  } catch (cause) {
    throw new JarvisTokenError("INVARIANT_VIOLATION", "JARVIS supply reconciliation failed", {
      cause: cause instanceof Error ? cause.message : String(cause),
      canonicalTotalBaseUnits: canonicalTotalBaseUnits.toString(),
      expectedMaximumBaseUnits: JARVIS_TOKEN.maximumBaseUnits.toString(),
      reserveDeltaBaseUnits: reserveDeltaBaseUnits.toString(),
    });
  }

  return {
    state: pendingForwardBaseUnits > 0n || pendingReverseBaseUnits > 0n ? "pending" : "balanced",
    canonicalTotalBaseUnits,
    lockedBaseUnits: snapshot.canonicalLockedBaseUnits,
    representedBaseUnits,
    pendingForwardBaseUnits,
    pendingReverseBaseUnits,
    reserveDeltaBaseUnits,
  };
}
