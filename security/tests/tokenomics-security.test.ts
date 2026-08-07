import test from "node:test";
import assert from "node:assert/strict";
import { authorizeAllocationClaim, validateTreasuryMovement } from "../functions/index.ts";

const allocation = {
  allocationId: "team-a",
  category: "team" as const,
  beneficiaryClass: "contributors",
  custodyAddress: "treasury",
  beneficiaryAddress: "beneficiary-1",
  percentageBps: 100,
  amountBaseUnits: 1_000n,
};
const schedule = {
  allocationId: "team-a",
  amountBaseUnits: 1_000n,
  curve: "immediate" as const,
  startAt: "2026-01-01T00:00:00.000Z",
  endAt: "2026-01-01T00:00:00.000Z",
};

test("allocation claim is beneficiary-bound", () => {
  assert.throws(() => authorizeAllocationClaim(allocation, schedule, {
    claimId: "claim-1", allocationId: "team-a", beneficiary: "attacker",
    amountBaseUnits: 1n, requestedAt: "2026-08-07T00:00:00.000Z",
  }, 0n), /beneficiary does not match/);
});

test("allocation claim rejects replayed claim ID", () => {
  assert.throws(() => authorizeAllocationClaim(allocation, schedule, {
    claimId: "claim-1", allocationId: "team-a", beneficiary: "beneficiary-1",
    amountBaseUnits: 1n, requestedAt: "2026-08-07T00:00:00.000Z",
  }, 0n, [{ claimId: "claim-1", transactionId: "tx-1", amountBaseUnits: 1n }]), /already been used/);
});

test("allocation claim cannot exceed vested amount", () => {
  assert.throws(() => authorizeAllocationClaim(allocation, schedule, {
    claimId: "claim-2", allocationId: "team-a", beneficiary: "beneficiary-1",
    amountBaseUnits: 1_001n, requestedAt: "2026-08-07T00:00:00.000Z",
  }, 0n), /exceeds currently claimable/);
});

test("treasury timelock is enforced", () => {
  const movement = {
    movementId: "m-1", purpose: "allocation" as const, amountBaseUnits: 100n,
    from: "treasury", to: "beneficiary", governanceRecord: "gov-1",
    approvedBy: ["a","b"], approvedAt: "2026-08-07T00:00:00.000Z",
    executableAt: "2026-08-07T01:00:00.000Z",
  };
  assert.throws(() => validateTreasuryMovement(movement, Date.parse("2026-08-07T00:30:00.000Z"), {
    minimumApprovals: 2, timelockSeconds: 3600,
  }), /timelock has not elapsed/);
});

test("treasury movement limit is enforced", () => {
  assert.throws(() => validateTreasuryMovement({
    movementId: "m-2", purpose: "reserve", amountBaseUnits: 101n,
    from: "treasury", to: "reserve", governanceRecord: "gov-1",
    approvedBy: ["a","b"], approvedAt: "2026-08-07T00:00:00.000Z",
  }, Date.parse("2026-08-07T02:00:00.000Z"), {
    minimumApprovals: 2, timelockSeconds: 0, maxMovementBaseUnits: 100n,
  }), /exceeds policy limit/);
});
