import assert from "node:assert/strict";
import test from "node:test";
import { createJarvisCanonicalAsset } from "../functions/asset.ts";
import { assertJarvisSupplyInvariant } from "../functions/supply.ts";
import { parseJarvisAmount, formatJarvisAmount } from "../utils/amounts.ts";
import { validateCanonicalJarvisAsset } from "../validation/validate.ts";
import { createJarvisTokenContext } from "../context/token-context.ts";

test("canonical JARVIS remains Sui with Wormhole-backed Solana representation", () => {
  const asset = createJarvisCanonicalAsset();
  assert.equal(asset.canonicalChain, "sui");
  assert.equal(asset.representations[0]?.type, "canonical");
  assert.equal(asset.representations[1]?.type, "bridged");
  assert.equal(asset.representations[1]?.provider, "wormhole");
  assert.equal(validateCanonicalJarvisAsset(asset).valid, true);
});

test("JARVIS decimal conversion is exact", () => {
  assert.equal(parseJarvisAmount("1.000001"), 1_000_001n);
  assert.equal(formatJarvisAmount(1_000_001n), "1.000001");
  assert.throws(() => parseJarvisAmount("0.0000001"));
});

test("reserve invariant accepts exact bridge backing", () => {
  assert.doesNotThrow(() => assertJarvisSupplyInvariant({
    canonicalCirculatingBaseUnits: 18_439_999_000_000_000n,
    canonicalLockedBaseUnits: 1_000_000_000n,
    bridgedSolanaBaseUnits: 1_000_000_000n,
  }));
});

test("bridge context never activates from the flag alone", () => {
  assert.equal(createJarvisTokenContext({ JARVIS_BRIDGE_ENABLED: "true" }).bridgeEnabled, false);
});
