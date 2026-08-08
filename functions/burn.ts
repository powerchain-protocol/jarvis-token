import type { BurnQuote, BurnRequest, BurnSnapshot } from "../types/burn.ts";

export const MAX_QUARTERLY_BURN_BPS = 200n;
export const BPS_DENOMINATOR = 10_000n;
export const BURN_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export function maximumQuarterlyBurnBaseUnits(circulatingBaseUnits: bigint): bigint {
  if (circulatingBaseUnits < 0n) throw new RangeError("circulatingBaseUnits must be non-negative");
  return (circulatingBaseUnits * MAX_QUARTERLY_BURN_BPS) / BPS_DENOMINATOR;
}

export function quoteQuarterlyBurn(snapshot: BurnSnapshot, request: BurnRequest): BurnQuote {
  if (request.requestedBaseUnits <= 0n) {
    return {
      allowed: false,
      requestedBaseUnits: request.requestedBaseUnits,
      maximumWindowBurnBaseUnits: 0n,
      remainingWindowCapacityBaseUnits: 0n,
      reason: "Burn amount must be positive",
    };
  }
  const maximum = maximumQuarterlyBurnBaseUnits(snapshot.circulatingBaseUnits);
  const remaining = maximum > snapshot.alreadyBurnedInWindowBaseUnits
    ? maximum - snapshot.alreadyBurnedInWindowBaseUnits
    : 0n;
  return {
    allowed: request.requestedBaseUnits <= remaining,
    requestedBaseUnits: request.requestedBaseUnits,
    maximumWindowBurnBaseUnits: maximum,
    remainingWindowCapacityBaseUnits: remaining,
    reason: request.requestedBaseUnits <= remaining ? undefined : "Quarterly 2% burn ceiling exceeded",
  };
}
