import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("deployment target templates", () => {
  it("cannot be mistaken for verified deployment evidence", async () => {
    const record = JSON.parse(
      await readFile("target/deployment-record.example.json", "utf8"),
    ) as {
      status: string;
      solana: { independentlyVerified: boolean; transactionSignatures: unknown[] };
      sui: { independentlyVerified: boolean; publishDigest: string | null };
    };

    expect(record.status).toBe("unverified-template");
    expect(record.solana.independentlyVerified).toBe(false);
    expect(record.solana.transactionSignatures).toHaveLength(0);
    expect(record.sui.independentlyVerified).toBe(false);
    expect(record.sui.publishDigest).toBeNull();
  });

  it("keeps the Sui publisher and treasury placeholders equal", async () => {
    const profile = JSON.parse(
      await readFile("target/profiles/sui-mainnet.example.json", "utf8"),
    ) as { publisherAddress: string; treasuryAddress: string };

    expect(profile.publisherAddress).toBe(profile.treasuryAddress);
  });

  it("keeps mainnet, testnet, and compatibility Move sources byte-identical", async () => {
    const [mainnet, testnet, compatibility] = await Promise.all([
      readFile("contracts/jarvis/sources/jarvis.move", "utf8"),
      readFile("testnet-contract/jarvis/sources/jarvis.move", "utf8"),
      readFile("packages/jarvis-sui/sources/jarvis.move", "utf8"),
    ]);

    expect(testnet).toBe(mainnet);
    expect(compatibility).toBe(mainnet);
  });
});
