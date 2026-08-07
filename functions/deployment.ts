import { canonicalJson } from "../utils/canonical-json.ts";
import type { JarvisEnvironment } from "../common/types.ts";

export interface TokenDeploymentDescriptor {
  environment: JarvisEnvironment;
  suiCoinType?: string;
  solanaMint?: string;
  wormholeProviderId?: string;
  verified: boolean;
}

export function deploymentReadiness(input: TokenDeploymentDescriptor): { ready: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.suiCoinType) reasons.push("sui-coin-type-missing");
  if (!input.solanaMint) reasons.push("solana-mint-missing");
  if (!input.wormholeProviderId) reasons.push("wormhole-provider-missing");
  if (!input.verified) reasons.push("deployment-not-verified");
  return { ready: reasons.length === 0, reasons };
}

export function deploymentCommitmentPayload(input: TokenDeploymentDescriptor): string {
  return canonicalJson({
    environment: input.environment,
    suiCoinType: input.suiCoinType ?? null,
    solanaMint: input.solanaMint ?? null,
    wormholeProviderId: input.wormholeProviderId ?? null,
    verified: input.verified,
  });
}
