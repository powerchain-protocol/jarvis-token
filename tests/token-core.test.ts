import test from "node:test";
import assert from "node:assert/strict";
import { JARVIS_TOKEN } from "../constants/token.ts";
import { parseJarvisAmount, formatJarvisAmount } from "../utils/amounts.ts";
import { createJarvisCanonicalAsset } from "../functions/asset.ts";
import { assertJarvisSupplyInvariant } from "../functions/supply.ts";
import { deploymentReadiness } from "../functions/deployment.ts";
import { evaluateTokenHealth } from "../functions/health.ts";
import { validateCanonicalJarvisAsset } from "../validation/validate.ts";
import { InMemoryTokenStorage } from "../storage/memory.ts";

const sui = `0x${"1".repeat(64)}::jarvis::JARVIS`;
const solana = "7FLDAMVxiiR6MUvF4dqMxfxDE7TaE4LJRLgypY4EHBgR";

test("JARVIS supply constants are exact", () => {
  assert.equal(JARVIS_TOKEN.maximumWholeSupply, 18_440_000_000n);
  assert.equal(JARVIS_TOKEN.maximumBaseUnits, 18_440_000_000_000_000n);
});

test("JARVIS decimal conversion is precision safe", () => {
  assert.equal(parseJarvisAmount("18440000000"), JARVIS_TOKEN.maximumBaseUnits);
  assert.equal(parseJarvisAmount("0.000001"), 1n);
  assert.equal(formatJarvisAmount(1n), "0.000001");
  assert.throws(() => parseJarvisAmount("0.0000001"));
});

test("canonical asset stays Sui canonical and Solana bridged", () => {
  const asset = createJarvisCanonicalAsset({ suiCoinType: sui, solanaMint: solana, verification: "verified" });
  const report = validateCanonicalJarvisAsset(asset);
  assert.equal(report.valid, true);
  assert.equal(asset.representations[0]?.type, "canonical");
  assert.equal(asset.representations[1]?.type, "bridged");
});

test("deployment readiness requires canonical and bridged deployment evidence", () => {
  assert.equal(deploymentReadiness({ environment: "testnet", verified: false }).ready, false);
  assert.equal(deploymentReadiness({
    environment: "testnet",
    bridgeEnabled: true,
    verified: true,
    wormholeProviderId: "wormhole-ntt",
    sui: {
      packageId: `0x${"2".repeat(64)}`,
      coinType: sui,
      metadataObjectId: `0x${"3".repeat(64)}`,
      fixedSupplyObjectId: `0x${"4".repeat(64)}`,
      publishedTransactionDigest: "publish-digest",
      observedSupplyBaseUnits: JARVIS_TOKEN.maximumBaseUnits,
      treasuryCapExists: false,
      sourceProfile: "token/contracts/sui-testnet",
      verified: true,
    },
    solana: {
      mint: solana,
      tokenProgram: "Token-2022",
      nttManagerProgramId: "11111111111111111111111111111111",
      mintAuthority: "11111111111111111111111111111111",
      freezeAuthority: null,
      observedSupplyBaseUnits: 0n,
      genesisSupplyVerifiedZero: true,
      verified: true,
    },
  }).ready, true);
});

test("health cannot report healthy for an unconfigured token", () => {
  const asset = createJarvisCanonicalAsset();
  assert.equal(evaluateTokenHealth(asset, false).state, "unavailable");
});

test("cross-chain supply invariant is exact", () => {
  assert.doesNotThrow(() => assertJarvisSupplyInvariant({
    canonicalCirculatingBaseUnits: JARVIS_TOKEN.maximumBaseUnits - 1000n,
    canonicalLockedBaseUnits: 1000n,
    bridgedSolanaBaseUnits: 1000n,
  }));
});

test("token storage clones and rejects duplicate snapshot ids", async () => {
  const storage = new InMemoryTokenStorage();
  const asset = createJarvisCanonicalAsset();
  await storage.putCanonicalAsset(asset);
  assert.notEqual(await storage.getCanonicalAsset(), asset);
  const snapshot = { id: "s1", recordedAt: "2026-08-07T00:00:00Z", digest: "abc", value: { ok: true } };
  await storage.appendSnapshot("health", snapshot);
  await assert.rejects(() => storage.appendSnapshot("health", snapshot));
  assert.equal((await storage.listSnapshots({ namespace: "health" })).length, 1);
});
