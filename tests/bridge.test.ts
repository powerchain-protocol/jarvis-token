import { describe, expect, it } from "vitest";
import { buildNttReviewPlan } from "../packages/token-core/src/bridge/config.js";
import { verifyBridgeSnapshot } from "../packages/token-core/src/bridge/invariants.js";

const maximum = "18440000000000000";

describe("cross-chain supply", () => {
  it("accepts settled and in-flight backed supply", () => {
    expect(verifyBridgeSnapshot({
      suiCirculatingBaseUnits: "18439999999999000", suiLockedBaseUnits: "1000",
      solanaWrappedSupplyBaseUnits: "900", inFlightSuiToSolanaBaseUnits: "100",
      inFlightSolanaToSuiBaseUnits: "0",
    }).verified).toBe(true);
  });

  it("rejects unbacked wrapped inflation", () => {
    expect(verifyBridgeSnapshot({
      suiCirculatingBaseUnits: "18439999999999000", suiLockedBaseUnits: "1000",
      solanaWrappedSupplyBaseUnits: "1001",
    }).verified).toBe(false);
  });

  it("accepts wrapped burn awaiting Sui release", () => {
    expect(verifyBridgeSnapshot({
      suiCirculatingBaseUnits: "18439999999999000", suiLockedBaseUnits: "1000",
      solanaWrappedSupplyBaseUnits: "900", inFlightSuiToSolanaBaseUnits: "0",
      inFlightSolanaToSuiBaseUnits: "100",
    }).verified).toBe(true);
  });

  it("forces Sui locking and Solana burning modes", () => {
    const plan = buildNttReviewPlan({
      environment: "testnet", provider: "wormhole-ntt", canonicalChain: "sui",
      canonicalMode: "locking", wrappedChain: "solana", wrappedMode: "burning",
      decimals: 6, maximumBaseUnits: maximum,
      sui: { coinType: "0x1::jarvis::JARVIS", managerPackageId: "0xabc", managerObjectId: "0xdef" },
      solana: { mint: "11111111111111111111111111111111", managerProgramId: "11111111111111111111111111111111", tokenAuthority: "11111111111111111111111111111111" },
      limits: { suiOutboundBaseUnits: "1000", solanaOutboundBaseUnits: "1000" },
      threshold: 1, transceivers: ["wormhole"], paused: true, broadcast: false, generateOnly: true,
    });
    expect(plan.broadcast).toBe(false);
    expect(plan.config.wrappedMode).toBe("burning");
  });

  it("rejects impossible or duplicate transceiver thresholds", () => {
    const base = {
      environment: "testnet", provider: "wormhole-ntt", canonicalChain: "sui", canonicalMode: "locking",
      wrappedChain: "solana", wrappedMode: "burning", decimals: 6, maximumBaseUnits: maximum,
      sui: { coinType: "0x1::jarvis::JARVIS", managerPackageId: "0xabc", managerObjectId: "0xdef" },
      solana: { mint: "11111111111111111111111111111111", managerProgramId: "11111111111111111111111111111111", tokenAuthority: "11111111111111111111111111111111" },
      limits: { suiOutboundBaseUnits: "1000", solanaOutboundBaseUnits: "1000" }, paused: true, broadcast: false, generateOnly: true,
    };
    expect(() => buildNttReviewPlan({ ...base, threshold: 2, transceivers: ["wormhole"] })).toThrow(/threshold exceeds/);
    expect(() => buildNttReviewPlan({ ...base, threshold: 1, transceivers: ["wormhole", "wormhole"] })).toThrow(/unique/);
  });
});
