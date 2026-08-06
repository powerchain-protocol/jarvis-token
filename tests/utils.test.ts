import { describe, expect, it } from "vitest";
import { canonicalJson, sha256CanonicalJson } from "../packages/token-core/src/utils/canonical-json.js";
import { assertChainNetwork, parseSolanaAddress, parseSuiAddressOrObject, parseSuiTransactionDigest } from "../packages/token-core/src/utils/chains.js";
import { assertNotBefore, parseIsoInstant } from "../packages/token-core/src/utils/time.js";

describe("shared security utilities", () => {
  it("canonicalizes nested JSON without changing array order", () => {
    expect(canonicalJson({ z: 1, a: { d: false, b: [2, 1] } })).toBe('{"a":{"b":[2,1],"d":false},"z":1}');
    expect(sha256CanonicalJson({ b: 2, a: 1 })).toBe(sha256CanonicalJson({ a: 1, b: 2 }));
    expect(sha256CanonicalJson([1, 2])).not.toBe(sha256CanonicalJson([2, 1]));
    expect(canonicalJson({ "ä": 1, z: 2, A: 3 })).toBe('{"A":3,"z":2,"ä":1}');
  });

  it("binds identifiers and networks to their chain", () => {
    const sui = `0x${"a".repeat(64)}`;
    expect(parseSuiAddressOrObject(sui)).toBe(sui);
    expect(parseSuiTransactionDigest("2".repeat(44))).toBe("2".repeat(44));
    expect(() => parseSuiTransactionDigest(sui)).toThrow();
    expect(parseSolanaAddress("11111111111111111111111111111111")).toBe("11111111111111111111111111111111");
    expect(() => assertChainNetwork("solana", "mainnet")).toThrow(/network/);
  });

  it("validates and orders ISO instants", () => {
    expect(parseIsoInstant("2026-08-06T12:00:00.000Z").toISOString()).toBe("2026-08-06T12:00:00.000Z");
    expect(() => parseIsoInstant("2026-08-06")).toThrow(/ISO-8601/);
    expect(() => assertNotBefore("2026-08-06T11:59:59.000Z", "2026-08-06T12:00:00.000Z", "confirmation", "submission")).toThrow(/confirmation must not precede submission/);
  });
});
