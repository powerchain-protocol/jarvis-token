import { describe, expect, it } from "vitest";
import { buildSuiDeploymentPlan } from "../packages/token-core/src/sui/plan.js";

describe("Sui deployment plan", () => {
  it("is non-broadcasting and records fixed-supply invariants", () => {
    const treasuryAddress = `0x${"1".repeat(64)}`;
    const plan = buildSuiDeploymentPlan({
      network: "mainnet-beta",
      treasuryAddress,
      publisherAddress: treasuryAddress,
      packagePath: "packages/jarvis-sui",
      gasBudget: 200_000_000,
    });

    expect(plan.broadcast).toBe(false);
    expect(plan.command).toContain("mainnet");
    expect(plan.expected.supplyBaseUnits).toBe("18440000000000000");
    expect(plan.expected.treasuryCap).toBe("consumed-during-publish");
  });

  it("rejects a publisher that differs from the treasury", () => {
    expect(() =>
      buildSuiDeploymentPlan({
        network: "mainnet-beta",
        treasuryAddress: `0x${"1".repeat(64)}`,
        publisherAddress: `0x${"2".repeat(64)}`,
        packagePath: "packages/jarvis-sui",
        gasBudget: 200_000_000,
      }),
    ).toThrow(/publisher must equal treasury/);
  });
});
