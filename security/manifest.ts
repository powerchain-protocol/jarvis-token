import { JarvisTokenError } from "../common/errors.ts";

export interface DeploymentManifest {
  schemaVersion: 1;
  environment: "testnet" | "mainnet";
  assetId: "jarvis";
  canonicalChain: "sui";
  suiCoinType: string;
  solanaMint: string;
  wormholeProviderId: string;
  generatedAt: string;
}

export interface SignedDeploymentManifest {
  manifest: DeploymentManifest;
  digest: string;
  signature?: string;
  signer?: string;
}

export function assertDeploymentManifestShape(value: DeploymentManifest): void {
  if (value.schemaVersion !== 1 || value.assetId !== "jarvis" || value.canonicalChain !== "sui") {
    throw new JarvisTokenError("INVALID_DEPLOYMENT", "Invalid JARVIS deployment manifest identity");
  }
  if (!value.suiCoinType || !value.solanaMint || !value.wormholeProviderId) {
    throw new JarvisTokenError("INVALID_DEPLOYMENT", "Deployment manifest identities are incomplete");
  }
}
