import { canonicalJson } from "../utils/canonical-json.ts";
import type { JarvisEnvironment } from "../common/types.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";

export interface SuiCanonicalDeploymentEvidence {
  packageId?: string;
  coinType?: string;
  metadataObjectId?: string;
  fixedSupplyObjectId?: string;
  publishedTransactionDigest?: string;
  observedSupplyBaseUnits?: bigint;
  treasuryCapExists?: boolean;
  sourceProfile: "token/contracts/sui-mainnet" | "token/contracts/sui-testnet";
  verified: boolean;
}

export interface SolanaBridgedDeploymentEvidence {
  mint?: string;
  tokenProgram?: "Token-2022";
  nttManagerProgramId?: string;
  mintAuthority?: string;
  freezeAuthority?: string | null;
  observedSupplyBaseUnits?: bigint;
  genesisSupplyVerifiedZero?: boolean;
  verified: boolean;
}

export interface TokenDeploymentDescriptor {
  environment: JarvisEnvironment;
  sui?: SuiCanonicalDeploymentEvidence;
  solana?: SolanaBridgedDeploymentEvidence;
  wormholeProviderId?: string;
  bridgeEnabled?: boolean;
  verified: boolean;
  /** @deprecated compatibility fields; use `sui.coinType` and `solana.mint`. */
  suiCoinType?: string;
  /** @deprecated compatibility fields; use `solana.mint`. */
  solanaMint?: string;
}

export interface DeploymentReadinessReport {
  ready: boolean;
  reasons: string[];
}

function uniqueReasons(reasons: string[]): DeploymentReadinessReport {
  const unique = [...new Set(reasons)];
  return { ready: unique.length === 0, reasons: unique };
}

export function canonicalSuiDeploymentReadiness(input: TokenDeploymentDescriptor): DeploymentReadinessReport {
  const reasons: string[] = [];
  const coinType = input.sui?.coinType ?? input.suiCoinType;
  if (!input.sui) reasons.push("sui-deployment-evidence-missing");
  if (!input.sui?.packageId) reasons.push("sui-package-id-missing");
  if (!coinType) reasons.push("sui-coin-type-missing");
  if (!input.sui?.metadataObjectId) reasons.push("sui-metadata-object-id-missing");
  if (!input.sui?.fixedSupplyObjectId) reasons.push("sui-fixed-supply-object-id-missing");
  if (!input.sui?.publishedTransactionDigest) reasons.push("sui-publish-transaction-missing");
  if (input.sui?.observedSupplyBaseUnits !== undefined && input.sui.observedSupplyBaseUnits !== JARVIS_TOKEN.maximumBaseUnits) {
    reasons.push("sui-supply-mismatch");
  }
  if (input.sui?.treasuryCapExists === true) reasons.push("sui-treasury-cap-still-exists");
  if (input.sui && !input.sui.verified) reasons.push("sui-deployment-not-verified");
  return uniqueReasons(reasons);
}

export function bridgedSolanaDeploymentReadiness(input: TokenDeploymentDescriptor): DeploymentReadinessReport {
  const reasons: string[] = [];
  const mint = input.solana?.mint ?? input.solanaMint;
  if (!input.solana) reasons.push("solana-deployment-evidence-missing");
  if (!mint) reasons.push("solana-mint-missing");
  if (input.solana?.tokenProgram !== "Token-2022") reasons.push("solana-token-program-invalid");
  if (!input.solana?.nttManagerProgramId) reasons.push("solana-ntt-manager-missing");
  if (!input.solana?.mintAuthority) reasons.push("solana-mint-authority-missing");
  if (input.solana?.freezeAuthority) reasons.push("solana-freeze-authority-must-be-disabled");
  if (input.solana?.genesisSupplyVerifiedZero !== true) reasons.push("solana-genesis-supply-not-verified-zero");
  if (input.solana && !input.solana.verified) reasons.push("solana-deployment-not-verified");
  if (!input.wormholeProviderId) reasons.push("wormhole-provider-missing");
  return uniqueReasons(reasons);
}

/** Full cross-chain readiness. Canonical Sui deployment can be valid before this becomes ready. */
export function deploymentReadiness(input: TokenDeploymentDescriptor): DeploymentReadinessReport {
  const reasons = [
    ...canonicalSuiDeploymentReadiness(input).reasons,
    ...bridgedSolanaDeploymentReadiness(input).reasons,
  ];
  if (!input.verified) reasons.push("deployment-not-verified");
  return uniqueReasons(reasons);
}

export function tokenRuntimeReadiness(input: TokenDeploymentDescriptor): DeploymentReadinessReport {
  return input.bridgeEnabled ? deploymentReadiness(input) : canonicalSuiDeploymentReadiness(input);
}

export function deploymentCommitmentPayload(input: TokenDeploymentDescriptor): string {
  return canonicalJson({
    environment: input.environment,
    bridgeEnabled: input.bridgeEnabled ?? false,
    sui: input.sui ? {
      ...input.sui,
      observedSupplyBaseUnits: input.sui.observedSupplyBaseUnits?.toString() ?? null,
    } : null,
    solana: input.solana ? {
      ...input.solana,
      observedSupplyBaseUnits: input.solana.observedSupplyBaseUnits?.toString() ?? null,
    } : null,
    wormholeProviderId: input.wormholeProviderId ?? null,
    verified: input.verified,
  });
}
