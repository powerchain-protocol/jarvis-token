import assert from "node:assert/strict";
import test from "node:test";
import { bridgeInvariant } from "../functions/bridge-accounting.ts";

test("bridge reserve invariant detects drift", () => {
  assert.equal(bridgeInvariant({ canonicalLockedBaseUnits: 10n, bridgedOutstandingBaseUnits: 10n, pendingMintBaseUnits: 0n, pendingReleaseBaseUnits: 0n }).ok, true);
  assert.equal(bridgeInvariant({ canonicalLockedBaseUnits: 9n, bridgedOutstandingBaseUnits: 10n, pendingMintBaseUnits: 0n, pendingReleaseBaseUnits: 0n }).ok, false);
});
