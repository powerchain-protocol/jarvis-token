import { canonicalJson, sha256CanonicalJson } from "../utils/canonical-json.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";
import { JARVIS_BRIDGE_POLICY } from "../constants/bridge.ts";

export type DeploymentEnvironment = "testnet" | "mainnet";
export type DeploymentSignatureAlgorithm = "ed25519" | "secp256k1" | "external";

export interface CanonicalSuiIdentity {
  packageId: string;
  coinType: string;
  metadataObjectId: string;
  fixedSupplyObjectId: string;
  publishedTransactionDigest: string;
}

export interface CanonicalSolanaIdentity {
  mint: string;
  nttManagerProgramId: string;
  bridgeProgramId: string;
  mintAuthority: string;
  tokenProgram: "Token-2022";
}

export interface CanonicalDeploymentManifest {
  schemaVersion: 2;
  environment: DeploymentEnvironment;
  assetId: "jarvis";
  canonicalChain: "sui";
  generatedAt: string;
  economics: {
    decimals: 6;
    fixedSupplyBaseUnits: string;
    canonicalMintingAfterGenesis: false;
    exactOneToOne: true;
  };
  sui: CanonicalSuiIdentity;
  solana: CanonicalSolanaIdentity;
  bridge: {
    provider: "wormhole";
    protocol: "ntt";
    canonicalMode: "lock-release";
    bridgedMode: "mint-burn";
  };
}

export interface DeploymentSignatureEvidence {
  signer: string;
  signature: string;
  algorithm: DeploymentSignatureAlgorithm;
  signedAt: string;
}

export interface SignedDeploymentEvidence {
  schemaVersion: 2;
  manifest: CanonicalDeploymentManifest;
  commitment: {
    algorithm: "sha256";
    canonicalization: "jarvis-canonical-json-v1";
    value: string;
  };
  signatures: readonly DeploymentSignatureEvidence[];
}

const FULL_SUI_ID = /^0x[0-9a-f]{64}$/;
const SUI_COIN_TYPE = /^(0x[0-9a-f]{64})::([a-zA-Z_][a-zA-Z0-9_]*)::([a-zA-Z_][a-zA-Z0-9_]*)$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

function decodeBase58Length(value: string): number {
  if (!BASE58.test(value)) return -1;
  let n = 0n;
  for (const char of value) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const digit = alphabet.indexOf(char);
    if (digit < 0) return -1;
    n = n * 58n + BigInt(digit);
  }
  let bytes = 0;
  let copy = n;
  while (copy > 0n) { bytes += 1; copy >>= 8n; }
  let leadingZeros = 0;
  for (const char of value) { if (char === "1") leadingZeros += 1; else break; }
  return bytes + leadingZeros;
}

export function isFullSuiObjectId(value: string): boolean {
  return FULL_SUI_ID.test(value);
}

export function isFullSuiCoinType(value: string, expectedPackageId?: string): boolean {
  const match = value.match(SUI_COIN_TYPE);
  if (!match) return false;
  return expectedPackageId === undefined || match[1] === expectedPackageId;
}

export function isExactSolanaPublicKey(value: string): boolean {
  return value.length >= 32 && value.length <= 44 && decodeBase58Length(value) === 32;
}

export function assertCanonicalIso8601Timestamp(value: string, field = "timestamp"): void {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) {
    throw new Error(`${field} must be canonical ISO-8601 UTC with millisecond precision`);
  }
}

function requireFullSuiId(value: string, field: string): void {
  if (!isFullSuiObjectId(value)) throw new Error(`${field} must be a full 32-byte lowercase Sui object ID`);
}

function requireSolanaKey(value: string, field: string): void {
  if (!isExactSolanaPublicKey(value)) throw new Error(`${field} must decode to a 32-byte Solana public key`);
}

export function validateCanonicalDeploymentManifest(manifest: CanonicalDeploymentManifest): void {
  if (manifest.schemaVersion !== 2) throw new Error("deployment manifest schemaVersion must be 2");
  if (manifest.assetId !== "jarvis" || manifest.canonicalChain !== "sui") throw new Error("deployment manifest asset identity mismatch");
  assertCanonicalIso8601Timestamp(manifest.generatedAt, "generatedAt");

  if (manifest.economics.decimals !== JARVIS_TOKEN.decimals) throw new Error("deployment decimals mismatch");
  if (manifest.economics.fixedSupplyBaseUnits !== JARVIS_TOKEN.maximumBaseUnits.toString()) throw new Error("deployment fixed supply mismatch");
  if (manifest.economics.canonicalMintingAfterGenesis !== false) throw new Error("canonical post-genesis minting must be disabled");
  if (manifest.economics.exactOneToOne !== true) throw new Error("bridge accounting must remain exact 1:1");

  requireFullSuiId(manifest.sui.packageId, "sui.packageId");
  requireFullSuiId(manifest.sui.metadataObjectId, "sui.metadataObjectId");
  requireFullSuiId(manifest.sui.fixedSupplyObjectId, "sui.fixedSupplyObjectId");
  if (!isFullSuiCoinType(manifest.sui.coinType, manifest.sui.packageId)) {
    throw new Error("sui.coinType must contain the exact full deployment package ID");
  }
  if (manifest.sui.publishedTransactionDigest.length < 32) throw new Error("sui published transaction digest is incomplete");

  requireSolanaKey(manifest.solana.mint, "solana.mint");
  requireSolanaKey(manifest.solana.nttManagerProgramId, "solana.nttManagerProgramId");
  requireSolanaKey(manifest.solana.bridgeProgramId, "solana.bridgeProgramId");
  requireSolanaKey(manifest.solana.mintAuthority, "solana.mintAuthority");
  if (manifest.solana.tokenProgram !== "Token-2022") throw new Error("Solana representation must use Token-2022");

  if (manifest.bridge.provider !== JARVIS_BRIDGE_POLICY.provider || manifest.bridge.protocol !== JARVIS_BRIDGE_POLICY.protocol) {
    throw new Error("bridge provider/protocol mismatch");
  }
  if (manifest.bridge.canonicalMode !== JARVIS_BRIDGE_POLICY.canonicalMode || manifest.bridge.bridgedMode !== JARVIS_BRIDGE_POLICY.bridgedMode) {
    throw new Error("bridge custody mode mismatch");
  }
}

export function canonicalDeploymentManifestJson(manifest: CanonicalDeploymentManifest): string {
  validateCanonicalDeploymentManifest(manifest);
  return canonicalJson(manifest);
}

export async function deploymentManifestCommitment(manifest: CanonicalDeploymentManifest): Promise<string> {
  validateCanonicalDeploymentManifest(manifest);
  return sha256CanonicalJson(manifest);
}

export async function createSignedDeploymentEvidence(
  manifest: CanonicalDeploymentManifest,
  signatures: readonly DeploymentSignatureEvidence[] = [],
): Promise<SignedDeploymentEvidence> {
  validateCanonicalDeploymentManifest(manifest);
  for (const signature of signatures) validateDeploymentSignatureEvidence(signature);
  return {
    schemaVersion: 2,
    manifest,
    commitment: {
      algorithm: "sha256",
      canonicalization: "jarvis-canonical-json-v1",
      value: await deploymentManifestCommitment(manifest),
    },
    signatures: [...signatures],
  };
}

export function validateDeploymentSignatureEvidence(signature: DeploymentSignatureEvidence): void {
  if (!signature.signer || !signature.signature) throw new Error("deployment signature evidence requires paired signer and signature");
  if (!isExactSolanaPublicKey(signature.signer) && !isFullSuiObjectId(signature.signer)) {
    throw new Error("deployment signature signer must be a full Sui identity or Solana public key");
  }
  if (!signature.signature.trim()) throw new Error("deployment signature cannot be empty");
  assertCanonicalIso8601Timestamp(signature.signedAt, "signedAt");
}

export async function verifySignedDeploymentEvidence(input: SignedDeploymentEvidence, options: {
  requireSignatures?: number;
  verifySignature?: (evidence: DeploymentSignatureEvidence, commitment: string) => boolean | Promise<boolean>;
} = {}): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];
  try { validateCanonicalDeploymentManifest(input.manifest); } catch (error) { issues.push(error instanceof Error ? error.message : "invalid deployment manifest"); }
  if (input.schemaVersion !== 2) issues.push("signed evidence schemaVersion must be 2");
  if (input.commitment.algorithm !== "sha256") issues.push("commitment algorithm must be sha256");
  if (input.commitment.canonicalization !== "jarvis-canonical-json-v1") issues.push("unsupported canonicalization profile");

  const expectedCommitment = await deploymentManifestCommitment(input.manifest).catch(() => "");
  if (!expectedCommitment || input.commitment.value !== expectedCommitment) issues.push("deployment manifest commitment mismatch");
  if (!/^[a-f0-9]{64}$/.test(input.commitment.value)) issues.push("deployment manifest commitment must be lowercase SHA-256 hex");

  const required = options.requireSignatures ?? 1;
  if (input.signatures.length < required) issues.push(`deployment evidence requires at least ${required} signature(s)`);
  const signerSet = new Set<string>();
  for (const signature of input.signatures) {
    try { validateDeploymentSignatureEvidence(signature); } catch (error) { issues.push(error instanceof Error ? error.message : "invalid signature evidence"); continue; }
    if (signerSet.has(signature.signer)) issues.push("duplicate deployment evidence signer");
    signerSet.add(signature.signer);
    if (options.verifySignature && !(await options.verifySignature(signature, input.commitment.value))) issues.push(`deployment signature verification failed for ${signature.signer}`);
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
