import { JarvisTokenError } from "../common/errors.ts";

export interface BridgeReserveObservation {
  lockedCanonicalBaseUnits: bigint;
  bridgedSupplyBaseUnits: bigint;
  pendingInboundBaseUnits?: bigint;
  pendingOutboundBaseUnits?: bigint;
}

export interface ReserveMonitorResult {
  healthy: boolean;
  expectedBridgedBaseUnits: bigint;
  deltaBaseUnits: bigint;
  reasons: readonly string[];
}

export function evaluateBridgeReserve(input: BridgeReserveObservation): ReserveMonitorResult {
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "bigint" && value < 0n) throw new JarvisTokenError("INVALID_AMOUNT", `${key} cannot be negative`);
  }
  const pendingInbound = input.pendingInboundBaseUnits ?? 0n;
  const pendingOutbound = input.pendingOutboundBaseUnits ?? 0n;
  const expected = input.lockedCanonicalBaseUnits + pendingInbound - pendingOutbound;
  const delta = input.bridgedSupplyBaseUnits - expected;
  const reasons: string[] = [];
  if (expected < 0n) reasons.push("pending-outbound-exceeds-reserves");
  if (delta > 0n) reasons.push("bridged-supply-exceeds-backed-reserve");
  if (delta < 0n) reasons.push("canonical-reserve-exceeds-bridged-supply");
  return { healthy: reasons.length === 0, expectedBridgedBaseUnits: expected, deltaBaseUnits: delta, reasons };
}
