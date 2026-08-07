import { JarvisTokenError } from "../common/errors.ts";

export type VestingCurve = "immediate" | "linear" | "milestone";

export interface VestingMilestone {
  id: string;
  unlockAt: string;
  amountBaseUnits: bigint;
}

export interface VestingSchedule {
  allocationId: string;
  amountBaseUnits: bigint;
  curve: VestingCurve;
  startAt: string;
  cliffAt?: string;
  endAt: string;
  milestones?: readonly VestingMilestone[];
}

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new JarvisTokenError("INVALID_ASSET", `${label} must be a valid ISO timestamp`);
  return parsed;
}

export function validateVestingSchedule(schedule: VestingSchedule): void {
  if (schedule.amountBaseUnits < 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Vesting amount cannot be negative");
  const start = timestamp(schedule.startAt, "startAt");
  const end = timestamp(schedule.endAt, "endAt");
  if (end < start) throw new JarvisTokenError("INVALID_ASSET", "Vesting end cannot predate start");
  if (schedule.cliffAt) {
    const cliff = timestamp(schedule.cliffAt, "cliffAt");
    if (cliff < start || cliff > end) throw new JarvisTokenError("INVALID_ASSET", "Vesting cliff must fall inside the schedule");
  }
  if (schedule.curve === "milestone") {
    const milestones = schedule.milestones ?? [];
    const ids = new Set<string>();
    let total = 0n;
    for (const milestone of milestones) {
      if (!milestone.id.trim() || ids.has(milestone.id)) throw new JarvisTokenError("INVALID_ASSET", "Milestone IDs must be unique and non-empty");
      ids.add(milestone.id);
      const at = timestamp(milestone.unlockAt, "milestone.unlockAt");
      if (at < start || at > end) throw new JarvisTokenError("INVALID_ASSET", "Milestone timestamp must fall inside the schedule");
      if (milestone.amountBaseUnits <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Milestone amount must be positive");
      total += milestone.amountBaseUnits;
    }
    if (total !== schedule.amountBaseUnits) throw new JarvisTokenError("INVARIANT_VIOLATION", "Milestones must reconcile exactly to the allocation amount");
  } else if (schedule.milestones?.length) {
    throw new JarvisTokenError("INVALID_ASSET", "Milestones are only valid for milestone vesting");
  }
}

export function vestedBaseUnitsAt(schedule: VestingSchedule, asOf: string): bigint {
  validateVestingSchedule(schedule);
  const at = timestamp(asOf, "asOf");
  const start = timestamp(schedule.startAt, "startAt");
  const end = timestamp(schedule.endAt, "endAt");
  if (schedule.curve === "immediate") return at >= start ? schedule.amountBaseUnits : 0n;
  if (schedule.curve === "milestone") {
    return (schedule.milestones ?? []).reduce(
      (sum, milestone) => at >= timestamp(milestone.unlockAt, "milestone.unlockAt") ? sum + milestone.amountBaseUnits : sum,
      0n,
    );
  }
  const cliff = schedule.cliffAt ? timestamp(schedule.cliffAt, "cliffAt") : start;
  if (at < cliff) return 0n;
  if (at >= end) return schedule.amountBaseUnits;
  if (end === start) return schedule.amountBaseUnits;
  return schedule.amountBaseUnits * BigInt(Math.max(0, at - start)) / BigInt(end - start);
}

export function claimableBaseUnitsAt(schedule: VestingSchedule, claimedBaseUnits: bigint, asOf: string): bigint {
  if (claimedBaseUnits < 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Claimed amount cannot be negative");
  const vested = vestedBaseUnitsAt(schedule, asOf);
  if (claimedBaseUnits > vested) throw new JarvisTokenError("INVARIANT_VIOLATION", "Claimed amount exceeds vested amount");
  return vested - claimedBaseUnits;
}
