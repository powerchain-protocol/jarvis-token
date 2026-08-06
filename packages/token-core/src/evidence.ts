import { z } from "zod";
import { verifyBridgeSnapshot, bridgeSnapshotSchema } from "./bridge/invariants.js";

const common = z.object({
  network: z.string().min(1), observedAt: z.iso.datetime(),
  independentlyVerified: z.literal(true), verifier: z.string().min(1),
});

export const solanaEvidenceSchema = common.extend({
  chain: z.literal("solana"), mint: z.string().min(32), metadataAccount: z.string().min(32),
  bridgeManagerProgramId: z.string().min(32), bridgeTokenAuthority: z.string().min(32),
  transactionSignatures: z.array(z.string().min(32)).min(2), wrappedSupplyBaseUnits: z.string().regex(/^\d+$/),
  mintAuthority: z.string().min(32), freezeAuthority: z.null(),
}).superRefine((evidence, context) => {
  if (evidence.metadataAccount !== evidence.mint) context.addIssue({ code: "custom", path: ["metadataAccount"], message: "Token-2022 metadata must be stored on the mint" });
  if (evidence.mintAuthority !== evidence.bridgeTokenAuthority) context.addIssue({ code: "custom", path: ["mintAuthority"], message: "mint authority must equal the verified NTT token authority" });
  if (BigInt(evidence.wrappedSupplyBaseUnits) > 18_440_000_000_000_000n) context.addIssue({ code: "custom", path: ["wrappedSupplyBaseUnits"], message: "wrapped supply exceeds the global cap" });
});

export const suiEvidenceSchema = common.extend({
  chain: z.literal("sui"), packageId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  coinType: z.string().includes("::jarvis::JARVIS"), fixedSupplyObjectId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  publishDigest: z.string().min(32), supplyBaseUnits: z.literal("18440000000000000"), treasuryCapPresent: z.literal(false),
}).superRefine((evidence, context) => {
  if (!evidence.coinType.startsWith(`${evidence.packageId}::`)) context.addIssue({ code: "custom", path: ["coinType"], message: "Sui coin type must be defined by the recorded package" });
});

export const deploymentEvidenceSchema = z.union([solanaEvidenceSchema, suiEvidenceSchema]);

export const releaseEvidenceSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal("verified"), generatedAt: z.iso.datetime(),
  solana: solanaEvidenceSchema, sui: suiEvidenceSchema,
  bridge: z.object({
    provider: z.literal("wormhole-ntt"), suiManagerPackageId: z.string(), suiManagerObjectId: z.string(),
    solanaManagerProgramId: z.string(), solanaTokenAuthority: z.string(), peersVerified: z.literal(true),
    managersPausedDuringVerification: z.literal(true),
  }),
  supplySnapshot: bridgeSnapshotSchema,
  allocationCommitmentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  artifactSha256: z.record(z.string().min(1), z.string().regex(/^[0-9a-f]{64}$/)).refine((items) => Object.keys(items).length >= 3, "at least three artifact hashes are required"),
  approvals: z.array(z.object({ reviewer: z.string().min(1), role: z.string().min(1), approvedAt: z.iso.datetime(), ticket: z.string().min(3) })).min(2),
}).superRefine((bundle, context) => {
  const issue = (path: (string | number)[], message: string) => context.addIssue({ code: "custom", path, message });
  if (bundle.solana.network !== "mainnet-beta" || bundle.sui.network !== "mainnet") issue(["status"], "release evidence must describe both mainnets");
  if (bundle.bridge.solanaManagerProgramId !== bundle.solana.bridgeManagerProgramId) issue(["bridge", "solanaManagerProgramId"], "bridge manager differs from Solana evidence");
  if (bundle.bridge.solanaTokenAuthority !== bundle.solana.bridgeTokenAuthority) issue(["bridge", "solanaTokenAuthority"], "bridge authority differs from Solana evidence");
  if (bundle.bridge.suiManagerPackageId === bundle.sui.packageId) issue(["bridge", "suiManagerPackageId"], "NTT package must be distinct from the JARVIS coin package");
  if (bundle.supplySnapshot.solanaWrappedSupplyBaseUnits !== bundle.solana.wrappedSupplyBaseUnits) issue(["supplySnapshot", "solanaWrappedSupplyBaseUnits"], "snapshot differs from Solana evidence");
  if (!verifyBridgeSnapshot(bundle.supplySnapshot).verified) issue(["supplySnapshot"], "cross-chain supply does not reconcile");
  if (new Set(bundle.approvals.map((approval) => approval.reviewer)).size < 2) issue(["approvals"], "two distinct reviewers are required");
});

export type DeploymentEvidence = z.infer<typeof deploymentEvidenceSchema>;
export type ReleaseEvidence = z.infer<typeof releaseEvidenceSchema>;
