import type { TokenActivationDecision } from "./activation.ts";
import type { TokenMonitoringReport } from "../services/monitoring.ts";

export interface TokenTransferGateDecision {
  allowed: boolean;
  reasons: readonly string[];
}

export function evaluateTokenTransferGate(input: {
  requestedBridgeEnabled: boolean;
  activation: TokenActivationDecision;
  monitoring?: TokenMonitoringReport;
}): TokenTransferGateDecision {
  const reasons: string[] = [];
  if (!input.requestedBridgeEnabled) reasons.push("bridge-disabled");
  if (!input.activation.allowed) reasons.push(...input.activation.reasons);
  if (!input.monitoring) reasons.push("monitoring-unavailable");
  else if (input.monitoring.pauseNewTransfers || !input.monitoring.healthy) reasons.push(...input.monitoring.reasons);
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}
