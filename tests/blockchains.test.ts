import { describe, expect, it } from "vitest";
import { digestBlockFinalityAnchor, validateBlockFinalityAnchor } from "../packages/token-core/src/blockchains.js";

describe("block finality anchors", () => {
  const anchor = { chain: "sui", network: "mainnet", blockHeight: "123", blockHash: "8".repeat(44), finality: "finalized" } as const;

  it("validates and commits finalized block data deterministically", () => {
    expect(validateBlockFinalityAnchor(anchor, "sui", "mainnet")).toEqual(anchor);
    expect(digestBlockFinalityAnchor(anchor)).toMatch(/^[a-f0-9]{64}$/);
    expect(digestBlockFinalityAnchor({ ...anchor })).toBe(digestBlockFinalityAnchor(anchor));
    expect(digestBlockFinalityAnchor({ ...anchor, blockHeight: "124" })).not.toBe(digestBlockFinalityAnchor(anchor));
  });

  it("rejects chain, network, height, hash, and finality defects", () => {
    expect(() => validateBlockFinalityAnchor(anchor, "solana", "mainnet")).toThrow(/chain/);
    expect(() => validateBlockFinalityAnchor({ ...anchor, network: "mainnet-beta" })).toThrow(/network/);
    expect(() => validateBlockFinalityAnchor({ ...anchor, blockHeight: "01" })).toThrow();
    expect(() => validateBlockFinalityAnchor({ ...anchor, blockHash: "0".repeat(44) })).toThrow();
    expect(() => validateBlockFinalityAnchor({ ...anchor, finality: "confirmed" })).toThrow();
  });
});
