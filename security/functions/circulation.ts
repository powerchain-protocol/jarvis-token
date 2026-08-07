import { JarvisTokenError } from "../common/errors.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";

export interface CirculatingSupplyInput {
  treasuryCustodyBaseUnits: bigint;
  allocationLockedBaseUnits: bigint;
  bridgeLockedBaseUnits: bigint;
  otherRestrictedBaseUnits?: bigint;
}

export interface CirculatingSupplyReport {
  maximumBaseUnits: bigint;
  restrictedBaseUnits: bigint;
  circulatingBaseUnits: bigint;
}

export function calculateCirculatingSupply(input: CirculatingSupplyInput): CirculatingSupplyReport {
  const values = [input.treasuryCustodyBaseUnits, input.allocationLockedBaseUnits, input.bridgeLockedBaseUnits, input.otherRestrictedBaseUnits ?? 0n];
  if (values.some((value) => value < 0n)) throw new JarvisTokenError("INVALID_AMOUNT", "Supply classifications cannot be negative");
  const restricted = values.reduce((sum, value) => sum + value, 0n);
  if (restricted > JARVIS_TOKEN.maximumBaseUnits) throw new JarvisTokenError("INVARIANT_VIOLATION", "Restricted balances exceed the fixed JARVIS supply");
  return {
    maximumBaseUnits: JARVIS_TOKEN.maximumBaseUnits,
    restrictedBaseUnits: restricted,
    circulatingBaseUnits: JARVIS_TOKEN.maximumBaseUnits - restricted,
  };
}
