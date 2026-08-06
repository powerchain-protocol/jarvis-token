import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TOKEN } from "../packages/token-core/src/constants.js";
import { buildAllocationCommitment, buildVestingSnapshot, TOKENOMICS_POLICY, validateApprovedAllocationPlan, verifyVestingSnapshot } from "../packages/token-core/src/tokenomics.js";

const allocation = (overrides: Record<string, unknown> = {}) => ({
  allocationId: "allocation-treasury", category: "treasury", percentageBps: 10_000,
  amountBaseUnits: TOKEN.maximumBaseUnits.toString(), beneficiaryClass: "protocol treasury",
  custodyAddress: "0xapproved-treasury", locked: false,
  vesting: { curve: "immediate", startAt: "2026-08-06T00:00:00.000Z", endAt: "2026-08-06T00:00:00.000Z", enforcementMechanism: "threshold multisig" },
  ...overrides,
});
const plan = (allocations: unknown[]) => ({
  schemaVersion: 1, tokenVersion: TOKEN.version, status: "approved",
  governanceRecord: "governance-record-001", approvedAt: "2026-08-06T00:00:00.000Z",
  reviewers: ["reviewer-alpha", "reviewer-beta"], allocations,
});

describe("machine-readable JARVIS tokenomics", () => {
  it("binds policy constants and accepts a fully reconciled approved plan", () => {
    expect(TOKENOMICS_POLICY.maximumBaseUnits).toBe(TOKEN.maximumBaseUnits.toString());
    expect(JSON.parse(readFileSync("config/tokenomics.policy.json", "utf8"))).toEqual(TOKENOMICS_POLICY);
    expect(validateApprovedAllocationPlan(plan([allocation()])).allocations).toHaveLength(1);
  });

  it("rejects percentage, amount, identity, approval, and vesting defects", () => {
    expect(() => validateApprovedAllocationPlan(plan([allocation({ percentageBps: 9_999 })]))).toThrow(/10000 basis points/);
    expect(() => validateApprovedAllocationPlan(plan([allocation({ amountBaseUnits: "1" })]))).toThrow(/does not match/);
    expect(() => validateApprovedAllocationPlan(plan([allocation({ custodyAddress: "TBD" })]))).toThrow(/placeholder/);
    expect(() => validateApprovedAllocationPlan({ ...plan([allocation()]), reviewers: ["same-reviewer", "same-reviewer"] })).toThrow(/unique/);
    expect(() => validateApprovedAllocationPlan({ ...plan([allocation()]), status: "draft", approvedAt: null })).toThrow(/not approved/);
    expect(() => validateApprovedAllocationPlan(plan([allocation({ locked: true })]))).toThrow(/cannot vest immediately/);
  });

  it("commits deterministically regardless of allocation and reviewer ordering", () => {
    const first = allocation({ allocationId: "allocation-public", category: "ecosystem-public", percentageBps: 4_000, amountBaseUnits: "7376000000000000" });
    const second = allocation({ allocationId: "allocation-reserve", category: "reserve", percentageBps: 6_000, amountBaseUnits: "11064000000000000" });
    const original = plan([first, second]);
    const reordered = { ...original, reviewers: [...original.reviewers].reverse(), allocations: [second, first] };
    const commitment = buildAllocationCommitment(original);
    expect(buildAllocationCommitment(reordered).allocationCommitmentSha256).toBe(commitment.allocationCommitmentSha256);
    expect(commitment.categoryTotals.reserve).toEqual({ percentageBps: 6_000, amountBaseUnits: "11064000000000000" });
    expect(buildAllocationCommitment(plan([{ ...first, beneficiaryClass: "different beneficiaries" }, second])).allocationCommitmentSha256).not.toBe(commitment.allocationCommitmentSha256);
  });

  it("projects linear vesting and enforces claim integrity", () => {
    const linear = allocation({
      locked: true,
      vesting: { curve: "linear", startAt: "2026-01-01T00:00:00.000Z", cliffAt: "2026-04-01T00:00:00.000Z", endAt: "2027-01-01T00:00:00.000Z", enforcementMechanism: "audited vesting contract" },
    });
    expect(buildVestingSnapshot(plan([linear]), "2026-03-01T00:00:00.000Z").vestedBaseUnits).toBe("0");
    const halfway = buildVestingSnapshot(plan([linear]), "2026-07-02T12:00:00.000Z", [{ allocationId: linear.allocationId, claimedBaseUnits: "100" }]);
    expect(halfway.vestedBaseUnits).toBe((TOKEN.maximumBaseUnits / 2n).toString());
    expect(halfway.claimedBaseUnits).toBe("100");
    expect(() => buildVestingSnapshot(plan([linear]), "2026-03-01T00:00:00.000Z", [{ allocationId: linear.allocationId, claimedBaseUnits: "1" }])).toThrow(/exceeds vested/);
    expect(() => buildVestingSnapshot(plan([linear]), "2026-07-01T00:00:00.000Z", [{ allocationId: "unknown-allocation", claimedBaseUnits: "1" }])).toThrow(/unknown allocation/);
  });

  it("validates and projects milestone vesting", () => {
    const firstAmount = (TOKEN.maximumBaseUnits / 4n).toString();
    const secondAmount = (TOKEN.maximumBaseUnits - TOKEN.maximumBaseUnits / 4n).toString();
    const milestones = [
      { milestoneId: "milestone-alpha", unlockAt: "2026-04-01T00:00:00.000Z", amountBaseUnits: firstAmount },
      { milestoneId: "milestone-beta", unlockAt: "2026-10-01T00:00:00.000Z", amountBaseUnits: secondAmount },
    ];
    const milestone = allocation({ locked: true, vesting: {
      curve: "milestone", startAt: "2026-01-01T00:00:00.000Z", endAt: "2027-01-01T00:00:00.000Z", enforcementMechanism: "audited milestone escrow",
      milestones,
    }});
    expect(buildVestingSnapshot(plan([milestone]), "2026-06-01T00:00:00.000Z").vestedBaseUnits).toBe(firstAmount);
    const malformed = { ...milestone, vesting: { ...milestone.vesting, milestones: [milestones[0]] } };
    expect(() => validateApprovedAllocationPlan(plan([malformed]))).toThrow(/must equal allocation amount/);
    const reversed = { ...milestone, vesting: { ...milestone.vesting, milestones: [...milestones].reverse() } };
    expect(buildAllocationCommitment(plan([reversed])).allocationCommitmentSha256).toBe(buildAllocationCommitment(plan([milestone])).allocationCommitmentSha256);
  });

  it("binds transaction claim events and produces tamper-evident category snapshots", () => {
    const events = [
      { claimId: "claim-event-beta", allocationId: "allocation-treasury", amountBaseUnits: "200", claimedAt: "2026-08-08T00:00:00.000Z", transactionId: "sui-transaction-beta" },
      { claimId: "claim-event-alpha", allocationId: "allocation-treasury", amountBaseUnits: "100", claimedAt: "2026-08-07T00:00:00.000Z", transactionId: "sui-transaction-alpha" },
    ];
    const snapshot = buildVestingSnapshot(plan([allocation()]), "2026-08-07T12:00:00.000Z", events);
    expect(snapshot.claimEvidenceMode).toBe("transaction-events");
    expect(snapshot.claimedBaseUnits).toBe("100");
    expect(snapshot.categoryTotals.treasury!.claimedBaseUnits).toBe("100");
    expect(snapshot.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(buildVestingSnapshot(plan([allocation()]), "2026-08-07T12:00:00.000Z", [...events].reverse()).snapshotSha256).toBe(snapshot.snapshotSha256);
    expect(buildVestingSnapshot(plan([allocation()]), "2026-08-07T12:00:00.000Z", [{ ...events[0]!, amountBaseUnits: "201" }, events[1]!]).snapshotSha256).not.toBe(snapshot.snapshotSha256);
    expect(() => buildVestingSnapshot(plan([allocation()]), "2026-08-09T00:00:00.000Z", [events[0]!, { ...events[1]!, claimId: events[0]!.claimId }])).toThrow(/duplicate claim event/);
    expect(() => buildVestingSnapshot(plan([allocation()]), "2026-08-09T00:00:00.000Z", [events[0]!, { ...events[1]!, transactionId: events[0]!.transactionId }])).toThrow(/duplicate claim transaction/);
    expect(verifyVestingSnapshot(snapshot, plan([allocation()]), events).verified).toBe(true);
    expect(() => verifyVestingSnapshot({ ...snapshot, claimedBaseUnits: "101" }, plan([allocation()]), events)).toThrow(/does not match/);
    expect(() => verifyVestingSnapshot(snapshot, plan([allocation({ beneficiaryClass: "changed beneficiary" })]), events)).toThrow(/does not match/);
  });

  it("rejects legacy aggregate claims during strict verification", () => {
    const claims = [{ allocationId: "allocation-treasury", claimedBaseUnits: "100" }];
    const snapshot = buildVestingSnapshot(plan([allocation()]), "2026-08-07T12:00:00.000Z", claims);
    expect(() => verifyVestingSnapshot(snapshot, plan([allocation()]), claims)).toThrow(/requires transaction claim events/);
    expect(verifyVestingSnapshot(snapshot, plan([allocation()]), claims, false).verified).toBe(true);
  });
});
