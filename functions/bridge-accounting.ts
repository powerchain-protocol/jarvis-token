export type BridgeAccounting = {
  canonicalLockedBaseUnits: bigint;
  bridgedOutstandingBaseUnits: bigint;
  pendingMintBaseUnits: bigint;
  pendingReleaseBaseUnits: bigint;
};

export function bridgeInvariant(state: BridgeAccounting): { ok: boolean; deltaBaseUnits: bigint } {
  const expectedBacking = state.bridgedOutstandingBaseUnits + state.pendingMintBaseUnits - state.pendingReleaseBaseUnits;
  const deltaBaseUnits = state.canonicalLockedBaseUnits - expectedBacking;
  return { ok: deltaBaseUnits === 0n, deltaBaseUnits };
}

export function assertBridgeInvariant(state: BridgeAccounting): void {
  const result = bridgeInvariant(state);
  if (!result.ok) throw new Error(`Bridge reserve invariant violated by ${result.deltaBaseUnits} base units`);
}
