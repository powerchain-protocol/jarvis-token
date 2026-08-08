import assert from "node:assert/strict";
import test from "node:test";
import { maximumQuarterlyBurnBaseUnits, quoteQuarterlyBurn } from "../functions/burn.ts";

test("quarterly burn is capped at 2 percent", () => {
  assert.equal(maximumQuarterlyBurnBaseUnits(20_000_000_000_000_000n), 400_000_000_000_000n);
  const quote = quoteQuarterlyBurn(
    { circulatingBaseUnits: 20_000_000_000_000_000n, alreadyBurnedInWindowBaseUnits: 100_000_000_000_000n },
    { requestedBaseUnits: 300_000_000_000_000n, requestedAtMs: 1, reason: "governance-approved burn" },
  );
  assert.equal(quote.allowed, true);
  assert.equal(quote.remainingWindowCapacityBaseUnits, 300_000_000_000_000n);
});
