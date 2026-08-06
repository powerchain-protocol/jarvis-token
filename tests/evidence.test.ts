import { describe, expect, it } from "vitest";
import { deploymentEvidenceSchema, releaseEvidenceSchema } from "../packages/token-core/src/evidence.js";

describe("deployment evidence", () => {
  it("accepts independently verified Solana evidence", () => {
    const key = "11111111111111111111111111111111";
    const evidence = deploymentEvidenceSchema.parse({
      chain: "solana",
      network: "mainnet-beta",
      observedAt: "2026-08-06T12:00:00.000Z",
      independentlyVerified: true,
      verifier: "independent-security-reviewer",
      mint: key,
      metadataAccount: key,
      bridgeManagerProgramId: key,
      bridgeTokenAuthority: key,
      transactionSignatures: ["a".repeat(64), "b".repeat(64)],
      wrappedSupplyBaseUnits: "0",
      mintAuthority: key,
      freezeAuthority: null,
    });

    expect(evidence.chain).toBe("solana");
  });

  it("rejects evidence with the wrong supply", () => {
    expect(() =>
      deploymentEvidenceSchema.parse({
        chain: "sui",
        network: "mainnet",
        observedAt: "2026-08-06T12:00:00.000Z",
        independentlyVerified: true,
        verifier: "independent-security-reviewer",
        packageId: `0x${"1".repeat(64)}`,
        coinType: `0x${"1".repeat(64)}::jarvis::JARVIS`,
        fixedSupplyObjectId: `0x${"2".repeat(64)}`,
        publishDigest: "d".repeat(64),
        supplyBaseUnits: "18439999999999999",
        treasuryCapPresent: false,
      }),
    ).toThrow();
  });

  it("requires a reconciled bundle and two distinct approvals", () => {
    const key = "11111111111111111111111111111111";
    const packageId = `0x${"1".repeat(64)}`;
    const bundle = {
      schemaVersion: 1, status: "verified", generatedAt: "2026-08-06T12:00:00.000Z",
      solana: { chain: "solana", network: "mainnet-beta", observedAt: "2026-08-06T12:00:00.000Z", independentlyVerified: true, verifier: "sol-reviewer", mint: key, metadataAccount: key, bridgeManagerProgramId: key, bridgeTokenAuthority: key, transactionSignatures: ["a".repeat(64), "b".repeat(64)], wrappedSupplyBaseUnits: "1000", mintAuthority: key, freezeAuthority: null },
      sui: { chain: "sui", network: "mainnet", observedAt: "2026-08-06T12:00:00.000Z", independentlyVerified: true, verifier: "sui-reviewer", packageId, coinType: `${packageId}::jarvis::JARVIS`, fixedSupplyObjectId: `0x${"2".repeat(64)}`, publishDigest: "d".repeat(64), supplyBaseUnits: "18440000000000000", treasuryCapPresent: false },
      bridge: { provider: "wormhole-ntt", suiManagerPackageId: `0x${"3".repeat(64)}`, suiManagerObjectId: `0x${"4".repeat(64)}`, solanaManagerProgramId: key, solanaTokenAuthority: key, peersVerified: true, managersPausedDuringVerification: true },
      supplySnapshot: { suiCirculatingBaseUnits: "18439999999999000", suiLockedBaseUnits: "1000", solanaWrappedSupplyBaseUnits: "1000", inFlightSuiToSolanaBaseUnits: "0", inFlightSolanaToSuiBaseUnits: "0" },
      allocationCommitmentSha256: "f".repeat(64),
      artifactSha256: { source: "a".repeat(64), move: "b".repeat(64), metadata: "c".repeat(64) },
      approvals: [
        { reviewer: "alice", role: "security", approvedAt: "2026-08-06T12:00:00.000Z", ticket: "CHG-1" },
        { reviewer: "bob", role: "operations", approvedAt: "2026-08-06T12:01:00.000Z", ticket: "CHG-1" },
      ],
    };
    expect(releaseEvidenceSchema.parse(bundle).status).toBe("verified");
    expect(() => releaseEvidenceSchema.parse({ ...bundle, approvals: [bundle.approvals[0], bundle.approvals[0]] })).toThrow(/distinct reviewers/);
  });
});
