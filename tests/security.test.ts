import test from "node:test";
import assert from "node:assert/strict";
import { assertNoPublicSecrets } from "../security/policy.ts";
import { assertSolanaAuthorityPolicy } from "../security/authorities.ts";

test("public secret-like token configuration is rejected", () => {
  assert.throws(() => assertNoPublicSecrets({ NEXT_PUBLIC_HELIUS_API_KEY: "secret" }));
});

test("Solana authority policy rejects freeze authority", () => {
  assert.throws(() => assertSolanaAuthorityPolicy({ mintAuthority: "bridge", expectedMintAuthority: "bridge", freezeAuthority: "freeze", supplyBaseUnits: 0n, expectedGenesis: true }));
});

test("Solana authority policy accepts zero-supply bridged genesis", () => {
  assert.doesNotThrow(() => assertSolanaAuthorityPolicy({ mintAuthority: "bridge", expectedMintAuthority: "bridge", freezeAuthority: null, supplyBaseUnits: 0n, expectedGenesis: true }));
});
