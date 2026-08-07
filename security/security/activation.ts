import { JarvisTokenError } from "../common/errors.ts";
import type { JarvisEnvironment } from "../common/types.ts";
import { deploymentReadiness, type TokenDeploymentDescriptor } from "../functions/deployment.ts";
import { assertTokenDeploymentSecurity, type TokenDeploymentSecurityInput } from "./policy.ts";

export interface TokenActivationInput extends Omit<TokenDeploymentDescriptor, "bridgeEnabled">, TokenDeploymentSecurityInput {
  environment: JarvisEnvironment;
  bridgeEnabled: boolean;
  wormholeRouteVerified: boolean;
  reserveMonitorEnabled: boolean;
  emergencyPauseConfigured: boolean;
}

export interface TokenActivationDecision {
  allowed: boolean;
  reasons: readonly string[];
}

export function evaluateTokenActivation(input: TokenActivationInput): TokenActivationDecision {
  const reasons = [...deploymentReadiness(input).reasons];
  try {
    assertTokenDeploymentSecurity(input);
  } catch (cause) {
    reasons.push(cause instanceof Error ? cause.message : String(cause));
  }
  if (!input.wormholeRouteVerified) reasons.push("wormhole-route-not-verified");
  if (!input.reserveMonitorEnabled) reasons.push("reserve-monitor-disabled");
  if (!input.emergencyPauseConfigured) reasons.push("emergency-pause-not-configured");
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function assertTokenActivationAllowed(input: TokenActivationInput): void {
  const decision = evaluateTokenActivation(input);
  if (!decision.allowed) {
    throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "JARVIS token bridge activation is not allowed", { reasons: decision.reasons });
  }
}
