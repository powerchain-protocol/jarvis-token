import type { DeploymentConfig } from "../../../../packages/token-core/src/config.js";
import {
  deploymentEvidenceSchema,
  releaseEvidenceSchema,
  type DeploymentEvidence,
  type ReleaseEvidence,
} from "../../../../packages/token-core/src/evidence.js";
import { TOKEN } from "../../../../packages/token-core/src/constants.js";
import {
  buildSolanaDeploymentPlan,
  type SolanaDeploymentPlan,
} from "../../../../packages/token-core/src/solana/plan.js";
import {
  verifySolanaDeployment,
  type SolanaVerificationReport,
} from "../../../../packages/token-core/src/solana/verify.js";
import {
  buildSuiDeploymentPlan,
  type SuiDeploymentPlan,
} from "../../../../packages/token-core/src/sui/plan.js";
import { buildNttReviewPlan, bridgeConfigSchema } from "../../../../packages/token-core/src/bridge/config.js";
import { verifyBridgeSnapshot } from "../../../../packages/token-core/src/bridge/invariants.js";
import { assertProductionConfiguration } from "../../../../packages/token-core/src/production.js";
import { calculateInFlightBaseUnits, completeBridgeTransfer, createBridgeTransfer, markBridgeTransferForManualReview, recordBridgeAttestation, type BridgeAttestation, type BridgeTransferRecord } from "../../../../packages/token-core/src/bridge/transfer.js";

/** Provider-independent facade for guarded JARVIS chain operations. */
export class JarvisClient {
  static readonly tokenomics = TOKEN;

  /** Generates unsigned Token-2022 messages and never broadcasts them. */
  buildSolanaDeploymentPlan(
    config: DeploymentConfig,
  ): Promise<SolanaDeploymentPlan> {
    return buildSolanaDeploymentPlan(config);
  }

  /** Performs read-only verification of the bridge-controlled wrapped mint. */
  verifySolanaGenesis(input: {
    rpcUrl: string;
    mintAddress: string;
    bridgeTokenAuthorityAddress: string;
    metadataUri: string;
  }): Promise<SolanaVerificationReport> {
    return verifySolanaDeployment(
      input.rpcUrl,
      input.mintAddress,
      input.bridgeTokenAuthorityAddress,
      input.metadataUri,
    );
  }

  /** Generates a review-only Sui publish command and expected invariants. */
  buildSuiDeploymentPlan(input: unknown): SuiDeploymentPlan {
    return buildSuiDeploymentPlan(input);
  }

  /** Validates an NTT configuration and returns an inert rollout plan. */
  buildBridgePlan(input: unknown) { return buildNttReviewPlan(bridgeConfigSchema.parse(input)); }

  /** Reconciles canonical, locked, wrapped, and in-flight base units. */
  verifyBridgeSnapshot(input: unknown) { return verifyBridgeSnapshot(input); }

  createBridgeTransfer(input: unknown, config: unknown, existing: Iterable<string | Pick<BridgeTransferRecord, "transferId" | "messageDigest">> = [], outboundUsedBaseUnits = "0") { return createBridgeTransfer(input, config, existing, outboundUsedBaseUnits); }
  recordBridgeAttestation(record: BridgeTransferRecord, input: BridgeAttestation & { messageDigest: string }) { return recordBridgeAttestation(record, input); }
  completeBridgeTransfer(record: BridgeTransferRecord, transaction: string, completedAt: string) { return completeBridgeTransfer(record, transaction, completedAt); }
  markBridgeTransferForManualReview(record: BridgeTransferRecord, reason: string) { return markBridgeTransferForManualReview(record, reason); }
  calculateInFlightBaseUnits(records: Iterable<BridgeTransferRecord>) { return calculateInFlightBaseUnits(records); }

  /** Rejects placeholders and cross-file mainnet identity mismatches. */
  validateProductionConfiguration(solana: unknown, bridge: unknown) {
    return assertProductionConfiguration(solana, bridge);
  }

  /** Validates independently verified, chain-specific deployment evidence. */
  validateDeploymentEvidence(input: unknown): DeploymentEvidence {
    return deploymentEvidenceSchema.parse(input);
  }

  /** Validates the complete cross-chain production evidence bundle. */
  validateReleaseEvidence(input: unknown): ReleaseEvidence {
    return releaseEvidenceSchema.parse(input);
  }
}
