import test from "node:test";
import assert from "node:assert/strict";
import { evaluateJarvisSupplyInvariant } from "../functions/supply.ts";
import { canonicalSuiDeploymentReadiness, bridgedSolanaDeploymentReadiness } from "../functions/deployment.ts";
import { reconcileJarvisSupply } from "../functions/reconciliation.ts";
import { JARVIS_BRIDGE_POLICY, assertBridgeTransferAmount } from "../constants/bridge.ts";

test("reverse burn remains a canonical custody liability until Sui release", () => {
  const total = 18_440_000_000_000_000n;
  const report = evaluateJarvisSupplyInvariant({
    canonicalCirculatingBaseUnits: total - 100n,
    canonicalLockedBaseUnits: 100n,
    bridgedSolanaBaseUnits: 90n,
    pendingSolanaToSuiBaseUnits: 10n,
  });
  assert.equal(report.expectedLockedBaseUnits, 100n);
  assert.equal(report.healthy, true);
});

test("canonical Sui token can be ready before Solana bridge representation", () => {
  const input = {
    environment: "testnet" as const,
    bridgeEnabled: false,
    verified: false,
    sui: {
      packageId: "0x1", coinType: "0x1::jarvis::JARVIS", metadataObjectId: "0x2", fixedSupplyObjectId: "0x3", genesisReceiptObjectId: "0x4",
      publishedTransactionDigest: "tx", observedSupplyBaseUnits: 18_440_000_000_000_000n, treasuryCapExists: false,
      sourceProfile: "token/contracts/sui-testnet" as const, verified: true,
    },
  };
  assert.equal(canonicalSuiDeploymentReadiness(input).ready, true);
  assert.equal(bridgedSolanaDeploymentReadiness(input).ready, false);
});


test("reconciliation uses the same reverse-transfer liability equation", () => {
  const total = 18_440_000_000_000_000n;
  const report = reconcileJarvisSupply({
    canonicalCirculatingBaseUnits: total - 100n,
    canonicalLockedBaseUnits: 100n,
    bridgedSolanaBaseUnits: 90n,
    pendingSolanaToSuiBaseUnits: 10n,
  });
  assert.equal(report.representedBaseUnits, 100n);
  assert.equal(report.reserveDeltaBaseUnits, 0n);
});

test("bridge policy binds Sui/Solana Wormhole domains and per-transfer limit", () => {
  assert.equal(JARVIS_BRIDGE_POLICY.wormholeChainIds.solana, 1);
  assert.equal(JARVIS_BRIDGE_POLICY.wormholeChainIds.sui, 21);
  assert.doesNotThrow(() => assertBridgeTransferAmount(1n));
  assert.throws(() => assertBridgeTransferAmount(JARVIS_BRIDGE_POLICY.recommendedMaxTransferBaseUnits + 1n));
});
