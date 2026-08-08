import test from "node:test";
import assert from "node:assert/strict";
import {
  allocationCommitment,
  calculateCirculatingSupply,
  claimableBaseUnitsAt,
  validateAllocationPlan,
  validateTreasuryMovement,
  vestedBaseUnitsAt,
} from "../functions/index.ts";

test("approved allocation reconciles exactly to fixed supply", () => {
  const plan = {
    schemaVersion: 1 as const,
    status: "approved" as const,
    governanceRecord: "gov-1",
    approvedAt: "2026-08-07T00:00:00.000Z",
    reviewers: ["reviewer-a", "reviewer-b"],
    allocations: [
      {
        allocationId: "all",
        category: "treasury" as const,
        beneficiaryClass: "treasury",
        custodyAddress: "0xabc",
        percentageBps: 10_000,
        amountBaseUnits: 20_000_000_000_000_000n,
      },
    ],
  };
  const report = validateAllocationPlan(plan, true);
  assert.equal(report.valid, true);
  assert.equal(report.totalPercentageBps, 10_000);
  assert.match(allocationCommitment(plan), /^[a-f0-9]{64}$/);
});

test("allocation rejects non-reconciling totals", () => {
  const report = validateAllocationPlan({
    schemaVersion: 1,
    status: "approved",
    governanceRecord: "gov",
    approvedAt: "2026-08-07T00:00:00.000Z",
    reviewers: ["a","b"],
    allocations: [{
      allocationId: "bad",
      category: "treasury",
      beneficiaryClass: "treasury",
      custodyAddress: "0xabc",
      percentageBps: 10_000,
      amountBaseUnits: 1n,
    }],
  }, true);
  assert.equal(report.valid, false);
  assert.ok(report.issues.includes("allocation-base-units-must-equal-fixed-supply"));
});

test("linear vesting uses integer base units", () => {
  const schedule = {
    allocationId: "team",
    amountBaseUnits: 1_000n,
    curve: "linear" as const,
    startAt: "2026-01-01T00:00:00.000Z",
    endAt: "2027-01-01T00:00:00.000Z",
  };
  assert.equal(vestedBaseUnitsAt(schedule, "2026-01-01T00:00:00.000Z"), 0n);
  assert.equal(vestedBaseUnitsAt(schedule, "2027-01-01T00:00:00.000Z"), 1_000n);
  assert.equal(claimableBaseUnitsAt(schedule, 250n, "2027-01-01T00:00:00.000Z"), 750n);
});

test("circulating supply excludes restricted balances", () => {
  const report = calculateCirculatingSupply({
    treasuryCustodyBaseUnits: 10_000n,
    allocationLockedBaseUnits: 20_000n,
    bridgeLockedBaseUnits: 30_000n,
  });
  assert.equal(report.circulatingBaseUnits, 20_000_000_000_000_000n - 60_000n);
});

test("treasury movement requires independent approval", () => {
  assert.throws(() => validateTreasuryMovement({
    movementId: "move-1",
    purpose: "allocation",
    amountBaseUnits: 1n,
    from: "treasury",
    to: "beneficiary",
    governanceRecord: "gov",
    approvedBy: ["same"],
    approvedAt: "2026-08-07T00:00:00.000Z",
  }), /two independent approvals/);
});
