import type { CanonicalAsset } from "../common/types.ts";

export type HealthState = "healthy" | "degraded" | "unavailable";
export interface TokenHealthCheck { id: string; label: string; state: HealthState; detail: string; }
export interface TokenHealth { state: HealthState; checks: readonly TokenHealthCheck[]; }

export function evaluateTokenHealth(asset: CanonicalAsset, bridgeEnabled: boolean): TokenHealth {
  const canonical = asset.representations.find((item) => item.type === "canonical");
  const bridged = asset.representations.find((item) => item.type === "bridged");
  const checks: TokenHealthCheck[] = [
    { id: "identity", label: "Canonical identity", state: canonical?.address ? "healthy" : "unavailable", detail: canonical?.address ? "Configured" : "Sui coin type not configured" },
    { id: "representation", label: "Solana representation", state: bridged?.address ? "healthy" : "unavailable", detail: bridged?.address ? "Configured" : "Solana mint not configured" },
    { id: "verification", label: "Deployment verification", state: asset.verification.status === "verified" ? "healthy" : "degraded", detail: asset.verification.status },
    { id: "bridge", label: "Bridge activation", state: bridgeEnabled ? "healthy" : "degraded", detail: bridgeEnabled ? "Enabled" : "Paused" },
  ];
  const state: HealthState = checks.some((item) => item.state === "unavailable") ? "unavailable" : checks.some((item) => item.state === "degraded") ? "degraded" : "healthy";
  return { state, checks };
}
