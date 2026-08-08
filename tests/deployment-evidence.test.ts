import test from "node:test";
import assert from "node:assert/strict";
import {
  createSignedDeploymentEvidence,
  deploymentManifestCommitment,
  validateCanonicalDeploymentManifest,
  verifySignedDeploymentEvidence,
  type CanonicalDeploymentManifest,
} from "../functions/deployment-evidence.ts";
import { productionDeploymentReadiness } from "../functions/deployment.ts";

const suiPackage = `0x${"a".repeat(64)}`;
const suiMetadata = `0x${"b".repeat(64)}`;
const suiSupply = `0x${"c".repeat(64)}`;
const solanaKey = "11111111111111111111111111111111";

function manifest(): CanonicalDeploymentManifest {
  return {
    schemaVersion: 2,
    environment: "mainnet",
    assetId: "jarvis",
    canonicalChain: "sui",
    generatedAt: "2026-08-08T05:08:00.000Z",
    economics: {
      decimals: 6,
      fixedSupplyBaseUnits: "20000000000000000",
      canonicalMintingAfterGenesis: false,
      exactOneToOne: true,
    },
    sui: {
      packageId: suiPackage,
      coinType: `${suiPackage}::jarvis::JARVIS`,
      metadataObjectId: suiMetadata,
      fixedSupplyObjectId: suiSupply,
      publishedTransactionDigest: "11111111111111111111111111111111",
    },
    solana: {
      mint: solanaKey,
      nttManagerProgramId: solanaKey,
      bridgeProgramId: solanaKey,
      mintAuthority: solanaKey,
      tokenProgram: "Token-2022",
    },
    bridge: {
      provider: "wormhole",
      protocol: "ntt",
      canonicalMode: "lock-release",
      bridgedMode: "mint-burn",
    },
  };
}

test("deployment commitment is deterministic and tamper-evident", async () => {
  const a = manifest();
  const b = { ...manifest(), economics: { ...manifest().economics } };
  assert.equal(await deploymentManifestCommitment(a), await deploymentManifestCommitment(b));
  const evidence = await createSignedDeploymentEvidence(a, [{
    signer: solanaKey,
    signature: "release-signature-evidence",
    algorithm: "external",
    signedAt: "2026-08-08T05:09:00.000Z",
  }]);
  evidence.manifest.solana.mintAuthority = "SysvarC1ock11111111111111111111111111111111";
  const result = await verifySignedDeploymentEvidence(evidence);
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes("deployment manifest commitment mismatch"));
});

test("deployment manifest rejects non-canonical timestamps and partial Sui identities", () => {
  const invalidTime = manifest();
  invalidTime.generatedAt = "2026-08-08T05:08:00Z";
  assert.throws(() => validateCanonicalDeploymentManifest(invalidTime), /canonical ISO-8601/);

  const invalidSui = manifest();
  invalidSui.sui.packageId = "0x1";
  assert.throws(() => validateCanonicalDeploymentManifest(invalidSui), /full 32-byte/);
});

test("production readiness requires complete Sui and Solana deployment identities", () => {
  const ready = productionDeploymentReadiness({
    environment: "mainnet",
    bridgeEnabled: true,
    verified: true,
    wormholeProviderId: "wormhole",
    sui: {
      packageId: suiPackage,
      coinType: `${suiPackage}::jarvis::JARVIS`,
      metadataObjectId: suiMetadata,
      fixedSupplyObjectId: suiSupply,
      publishedTransactionDigest: "11111111111111111111111111111111",
      observedSupplyBaseUnits: 20_000_000_000_000_000n,
      treasuryCapExists: false,
      sourceProfile: "token/contracts/mainnet",
      verified: true,
    },
    solana: {
      mint: solanaKey,
      tokenProgram: "Token-2022",
      nttManagerProgramId: solanaKey,
      bridgeProgramId: solanaKey,
      mintAuthority: solanaKey,
      freezeAuthority: null,
      observedSupplyBaseUnits: 0n,
      genesisSupplyVerifiedZero: true,
      verified: true,
    },
  });
  assert.equal(ready.ready, true, ready.reasons.join(", "));
});

test("signature evidence requires paired signer and signature", async () => {
  await assert.rejects(() => createSignedDeploymentEvidence(manifest(), [{
    signer: solanaKey,
    signature: "",
    algorithm: "external",
    signedAt: "2026-08-08T05:09:00.000Z",
  }]), /paired signer and signature/);
});

import { verifyProductionOnChainJarvis } from "../functions/onchain-verification.ts";

test("production on-chain verification enforces Sui finalization and Solana mint authority", () => {
  const coinType = `${suiPackage}::jarvis::JARVIS`;
  const result = verifyProductionOnChainJarvis({
    expectedSuiCoinType: coinType,
    expectedSolanaMint: solanaKey,
    expectedSolanaMintAuthority: solanaKey,
    sui: { coinType, decimals: 6, totalSupplyBaseUnits: 20_000_000_000_000_000n, treasuryCapExists: false, metadataFrozen: true },
    solana: { mint: solanaKey, decimals: 6, supplyBaseUnits: 0n, freezeAuthority: null, mintAuthority: solanaKey },
  });
  assert.equal(result.valid, true, result.issues.join(", "));
});
