import test from "node:test";
import assert from "node:assert/strict";
import { evaluateJarvisSupplyInvariant } from "../functions/supply.ts";
import { canonicalSuiDeploymentReadiness, bridgedSolanaDeploymentReadiness } from "../functions/deployment.ts";

test("reverse burn remains a canonical custody liability until Sui release", () => {
  const total = 20_000_000_000_000_000n;
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
      packageId: "0x1", coinType: "0x1::jarvis::JARVIS", metadataObjectId: "0x2", fixedSupplyObjectId: "0x3",
      publishedTransactionDigest: "tx", observedSupplyBaseUnits: 20_000_000_000_000_000n, treasuryCapExists: false,
      sourceProfile: "token/contracts/devnet" as const, verified: true,
    },
  };
  assert.equal(canonicalSuiDeploymentReadiness(input).ready, true);
  assert.equal(bridgedSolanaDeploymentReadiness(input).ready, false);
});
