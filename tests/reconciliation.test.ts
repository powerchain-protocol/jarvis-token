import assert from "node:assert/strict";
import test from "node:test";
import { JARVIS_TOKEN } from "../constants/token.ts";
import { reconcileJarvisSupply } from "../functions/reconciliation.ts";
import { createJarvisCanonicalAsset } from "../functions/asset.ts";
import { createTokenMetadataDocument } from "../functions/metadata.ts";
import { evaluateTokenActivation } from "../security/activation.ts";
import { createTokenStatusPresentation, compactTokenAddress } from "../ui/token-presentation.ts";

test("reconciliation reports balanced exact reserves", () => {
  const report = reconcileJarvisSupply({
    canonicalCirculatingBaseUnits: JARVIS_TOKEN.maximumBaseUnits - 1_000_000n,
    canonicalLockedBaseUnits: 1_000_000n,
    bridgedSolanaBaseUnits: 1_000_000n,
  });
  assert.equal(report.state, "balanced");
  assert.equal(report.reserveDeltaBaseUnits, 0n);
});

test("reconciliation includes pending bridge lifecycle", () => {
  const report = reconcileJarvisSupply({
    canonicalCirculatingBaseUnits: JARVIS_TOKEN.maximumBaseUnits - 1_500_000n,
    canonicalLockedBaseUnits: 1_500_000n,
    bridgedSolanaBaseUnits: 1_000_000n,
    pendingSuiToSolanaBaseUnits: 500_000n,
  });
  assert.equal(report.state, "pending");
  assert.equal(report.reserveDeltaBaseUnits, 0n);
});

test("metadata documents are deterministic and checksummed", () => {
  const asset = createJarvisCanonicalAsset();
  const first = createTokenMetadataDocument(asset);
  const second = createTokenMetadataDocument(asset);
  assert.equal(first.digest, second.digest);
  assert.match(first.digest, /^[0-9a-f]{64}$/);
});

test("activation requires verification, route, reserve monitoring and pause control", () => {
  const decision = evaluateTokenActivation({
    environment: "testnet",
    bridgeEnabled: true,
    verified: true,
    suiCoinType: `0x${"1".repeat(64)}::jarvis::JARVIS`,
    solanaMint: "7FLDAMVxiiR6MUvF4dqMxfxDE7TaE4LJRLgypY4EHBgR",
    solanaBridgeProgramId: "9FLDAMVxiiR6MUvF4dqMxfxDE7TaE4LJRLgypY4EHBgR",
    solanaTokenAuthority: "8FLDAMVxiiR6MUvF4dqMxfxDE7TaE4LJRLgypY4EHBgR",
    freezeAuthority: null,
    wormholeProviderId: "wormhole-ntt",
    wormholeRouteVerified: false,
    reserveMonitorEnabled: true,
    emergencyPauseConfigured: true,
  });
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes("wormhole-route-not-verified"));
});

test("UI status never reports operational before configuration and verification", () => {
  assert.equal(createTokenStatusPresentation({ configured: false, verified: false, bridgeEnabled: false }).state, "unconfigured");
  assert.equal(createTokenStatusPresentation({ configured: true, verified: true, bridgeEnabled: true }).state, "ready");
  assert.equal(compactTokenAddress(undefined), "Not configured");
});

test("pure TypeScript SHA-256 matches the standard vector", async () => {
  const { sha256Text } = await import("../utils/checksums.ts");
  assert.equal(sha256Text("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
