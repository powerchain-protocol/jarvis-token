import { describe, expect, it } from "vitest";
import { deploymentConfigSchema } from "../packages/token-core/src/config.js";
import { TOKEN } from "../packages/token-core/src/constants.js";
import {
  assertBroadcastAllowed,
  publicRpcOrigin,
} from "../packages/token-core/src/network.js";

describe("JARVIS tokenomics", () => {
  it("uses the frozen fixed-supply constants", () => {
    expect(TOKEN.decimals).toBe(6);
    expect(TOKEN.maximumWholeSupply).toBe(18_440_000_000n);
    expect(TOKEN.maximumBaseUnits).toBe(18_440_000_000_000_000n);
    expect(TOKEN.maximumWholeSupply * 10n ** BigInt(TOKEN.decimals)).toBe(
      TOKEN.maximumBaseUnits,
    );
  });

  it("prohibits mainnet broadcast", () => {
    expect(() => assertBroadcastAllowed("mainnet-beta", true)).toThrow(
      /Mainnet broadcasting is prohibited/,
    );
    expect(() => assertBroadcastAllowed("mainnet-beta", false)).not.toThrow();
  });

  it("removes RPC credentials and paths from generated artifacts", () => {
    expect(publicRpcOrigin("https://user:secret@rpc.example.com/api/key?token=secret")).toBe(
      "https://rpc.example.com",
    );
  });

  it("requires an explicit review acknowledgement for mainnet plans", () => {
    const key = "11111111111111111111111111111111";
    expect(() =>
      deploymentConfigSchema.parse({
        network: "mainnet-beta",
        rpcUrl: "https://api.mainnet-beta.solana.com",
        treasuryAddress: key,
        feePayerAddress: key,
        mintAddress: key,
        mintAuthorityAddress: key,
        bridgeTokenAuthorityAddress: key,
        metadata: {
          uri: "https://example.com/jarvis.json",
          updateAuthorityAddress: key,
          canonicalMechanism: "token-2022-mint-extension",
        },
        broadcast: false,
      }),
    ).toThrow(/review acknowledgement/);
  });
});
