import { JarvisTokenError } from "../common/errors.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";

export const BASIS_POINTS = 10_000n;

export function mulDivFloor(value: bigint, numerator: bigint, denominator: bigint): bigint {
  if (value < 0n || numerator < 0n || denominator <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "mulDivFloor requires non-negative values and a positive denominator");
  return value * numerator / denominator;
}

export function applyBasisPoints(value: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new JarvisTokenError("INVALID_AMOUNT", "Basis points must be between 0 and 10000");
  return mulDivFloor(value, BigInt(bps), BASIS_POINTS);
}

export function calculateOneToOneBridgeAmount(inputBaseUnits: bigint): bigint {
  if (inputBaseUnits <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Bridge amount must be positive");
  if (inputBaseUnits > JARVIS_TOKEN.maximumBaseUnits) throw new JarvisTokenError("INVALID_AMOUNT", "Bridge amount exceeds the JARVIS supply ceiling");
  return inputBaseUnits;
}

export function percentageChangeBps(previous: bigint, current: bigint): bigint | null {
  if (previous <= 0n) return null;
  return (current - previous) * BASIS_POINTS / previous;
}
