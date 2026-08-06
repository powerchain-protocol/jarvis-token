import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { assertProductionConfiguration } from "../packages/token-core/src/production.js";

function key() { return Keypair.generate().publicKey.toBase58(); }

describe("production configuration", () => {
  it("cross-checks mint and NTT authority identities", () => {
    const mint = key(); const bridgeAuthority = key();
    const solana = {
      network: "mainnet-beta", rpcUrl: "https://rpc.example.com",
      treasuryAddress: key(), feePayerAddress: key(), mintAddress: mint,
      mintAuthorityAddress: key(), bridgeTokenAuthorityAddress: bridgeAuthority,
      metadata: { uri: "https://cdn.example.com/jarvis.json", updateAuthorityAddress: key(), canonicalMechanism: "token-2022-mint-extension" },
      broadcast: false, mainnetReview: { changeTicket: "CHG-1", reviewedBy: "reviewer", generateOnly: true },
    };
    const bridge = {
      environment: "mainnet", provider: "wormhole-ntt", canonicalChain: "sui", canonicalMode: "locking",
      wrappedChain: "solana", wrappedMode: "burning", decimals: 6, maximumBaseUnits: "18440000000000000",
      sui: { coinType: `0x${"1".repeat(64)}::jarvis::JARVIS`, managerPackageId: `0x${"2".repeat(64)}`, managerObjectId: `0x${"3".repeat(64)}` },
      solana: { mint, managerProgramId: key(), tokenAuthority: bridgeAuthority },
      limits: { suiOutboundBaseUnits: "0", solanaOutboundBaseUnits: "0" }, threshold: 1,
      transceivers: ["wormhole"], paused: true, broadcast: false, generateOnly: true,
    };
    expect(assertProductionConfiguration(solana, bridge).bridge.solana.mint).toBe(mint);
    expect(() => assertProductionConfiguration(solana, { ...bridge, solana: { ...bridge.solana, mint: key() } })).toThrow(/mint differs/);
  });
});
