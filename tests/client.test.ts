import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  JARVIS_SOLANA_PROGRAMS,
  JarvisClient,
} from "../clients/typescript/src/index.js";
import { PROGRAM_IDS } from "../packages/token-core/src/constants.js";

describe("JARVIS TypeScript client", () => {
  it("exposes fixed tokenomics and no broadcast or signing API", () => {
    const client = new JarvisClient();

    expect(JarvisClient.tokenomics.maximumBaseUnits).toBe(18_440_000_000_000_000n);
    expect("broadcast" in client).toBe(false);
    expect("sign" in client).toBe(false);
  });

  it("uses Token-2022 and declares no custom JARVIS program", () => {
    expect(JARVIS_SOLANA_PROGRAMS.token2022).toBe(PROGRAM_IDS.token2022);
    expect(JARVIS_SOLANA_PROGRAMS.customJarvisProgram).toBeNull();
    expect(JARVIS_SOLANA_PROGRAMS.legacyTokenProgramPermitted).toBe(false);
  });

  it("generates Sui plans through the public facade", () => {
    const client = new JarvisClient();
    const treasury = `0x${"1".repeat(64)}`;
    const plan = client.buildSuiDeploymentPlan({
      network: "testnet",
      treasuryAddress: treasury,
      publisherAddress: treasury,
    });

    expect(plan.command).toContain("testnet-contract/jarvis");
    expect(plan.broadcast).toBe(false);
  });

  it("keeps mainnet and testnet program profiles on the canonical stack", async () => {
    const paths = [
      "programs/mainnet/jarvis/token-2022.json",
      "programs/testnet/jarvis/token-2022.json",
    ];
    for (const path of paths) {
      const profile = JSON.parse(await readFile(path, "utf8")) as {
        token2022ProgramId: string;
        customJarvisProgramId: string | null;
        legacyTokenProgramPermitted: boolean;
        mint: string | null;
      };
      expect(profile.token2022ProgramId).toBe(PROGRAM_IDS.token2022);
      expect(profile.customJarvisProgramId).toBeNull();
      expect(profile.legacyTokenProgramPermitted).toBe(false);
      expect(profile.mint).toBeNull();
    }
  });
});
