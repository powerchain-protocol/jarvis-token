import { Connection, Keypair, Message } from "@solana/web3.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSolanaDeploymentPlan } from "../packages/token-core/src/solana/plan.js";

describe("Solana Token-2022 deployment plan", () => {
  afterEach(() => vi.restoreAllMocks());

  it("builds ordered unsigned messages with no broadcast path", async () => {
    vi.spyOn(Connection.prototype, "getMinimumBalanceForRentExemption").mockResolvedValue(
      1_500_000,
    );
    vi.spyOn(Connection.prototype, "getLatestBlockhash").mockResolvedValue({
      blockhash: Keypair.generate().publicKey.toBase58(),
      lastValidBlockHeight: 42,
    });

    const feePayer = Keypair.generate().publicKey.toBase58();
    const mint = Keypair.generate().publicKey.toBase58();
    const mintAuthority = Keypair.generate().publicKey.toBase58();
    const metadataAuthority = Keypair.generate().publicKey.toBase58();
    const bridgeTokenAuthority = Keypair.generate().publicKey.toBase58();
    const treasury = Keypair.generate().publicKey.toBase58();
    const plan = await buildSolanaDeploymentPlan({
      network: "mainnet-beta",
      rpcUrl: "https://api.mainnet-beta.solana.com",
      feePayerAddress: feePayer,
      mintAddress: mint,
      mintAuthorityAddress: mintAuthority,
      bridgeTokenAuthorityAddress: bridgeTokenAuthority,
      treasuryAddress: treasury,
      broadcast: false,
      mainnetReview: {
        changeTicket: "CHG-1234",
        reviewedBy: "security-reviewer",
        generateOnly: true,
      },
      metadata: {
        uri: "https://example.com/jarvis.json",
        updateAuthorityAddress: metadataAuthority,
        canonicalMechanism: "token-2022-mint-extension",
      },
    });

    expect(plan.broadcast).toBe(false);
    expect(plan.rpcOrigin).toBe("https://api.mainnet-beta.solana.com");
    expect(plan.initialSupplyBaseUnits).toBe("0");
    expect(plan.bridgeTokenAuthority).toBe(bridgeTokenAuthority);
    expect(plan.steps.map((step) => step.name)).toEqual([
      "initialize-mint-and-metadata",
      "freeze-metadata",
    ]);
    expect(plan.authorityHandoff).toEqual({
      mechanism: "wormhole-ntt-checked-set-claim",
      expectedTokenAuthority: bridgeTokenAuthority,
      includedInPlan: false,
    });
    for (const step of plan.steps) {
      const message = Message.from(Buffer.from(step.messageBase64, "base64"));
      expect(message.recentBlockhash).toBe(plan.recentBlockhash);
      expect(message.header.numRequiredSignatures).toBeGreaterThan(0);
    }
  });
});
