import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBridgeReserve } from "../functions/reserve-monitor.ts";
import { verifyOnChainJarvis } from "../functions/onchain-verification.ts";

test("reserve monitor accepts exact backing", () => {
  const result = evaluateBridgeReserve({ lockedCanonicalBaseUnits: 100n, bridgedSupplyBaseUnits: 100n });
  assert.equal(result.healthy, true);
  assert.equal(result.deltaBaseUnits, 0n);
});

test("reserve monitor detects unbacked bridged supply", () => {
  const result = evaluateBridgeReserve({ lockedCanonicalBaseUnits: 100n, bridgedSupplyBaseUnits: 101n });
  assert.equal(result.healthy, false);
  assert.ok(result.reasons.includes("bridged-supply-exceeds-backed-reserve"));
});

test("on-chain verification checks decimals, identity and freeze authority", () => {
  const result = verifyOnChainJarvis({
    expectedSuiCoinType: "0x1::jarvis::JARVIS",
    expectedSolanaMint: "11111111111111111111111111111111",
    sui: { coinType: "0x1::jarvis::JARVIS", decimals: 6, totalSupplyBaseUnits: 100n },
    solana: { mint: "11111111111111111111111111111111", decimals: 6, supplyBaseUnits: 100n, freezeAuthority: null },
  });
  assert.equal(result.valid, true);
});
