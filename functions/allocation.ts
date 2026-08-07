import { JarvisTokenError } from "../common/errors.ts";
import { JARVIS_TOKEN } from "../constants/token.ts";
import { canonicalSha256 } from "../utils/checksums.ts";

export type AllocationCategory =
  | "ecosystem"
  | "team"
  | "development"
  | "treasury"
  | "liquidity"
  | "marketing"
  | "reserve"
  | "incentives"
  | "other";

export interface AllocationEntry {
  allocationId: string;
  category: AllocationCategory;
  beneficiaryClass: string;
  custodyAddress: string;
  beneficiaryAddress?: string;
  percentageBps: number;
  amountBaseUnits: bigint;
  /** Explicit integer remainder adjustment from floor(maxSupply * bps / 10000). */
  roundingAdjustmentBaseUnits?: bigint;
}

export interface AllocationPlan {
  schemaVersion: 1;
  status: "draft" | "approved";
  governanceRecord: string;
  approvedAt?: string;
  reviewers: readonly string[];
  allocations: readonly AllocationEntry[];
}

export interface AllocationValidation {
  valid: boolean;
  issues: readonly string[];
  totalPercentageBps: number;
  totalBaseUnits: bigint;
}

export function validateAllocationPlan(plan: AllocationPlan, requireApproval = false): AllocationValidation {
  const issues: string[] = [];
  const ids = new Set<string>();
  let bps = 0;
  let total = 0n;
  let adjustmentTotal = 0n;

  if (plan.schemaVersion !== 1) issues.push("schema-version-invalid");
  if (!plan.governanceRecord.trim()) issues.push("governance-record-required");
  if (requireApproval && (plan.status !== "approved" || !plan.approvedAt)) issues.push("allocation-plan-not-approved");
  if (requireApproval && new Set(plan.reviewers).size < 2) issues.push("two-independent-reviewers-required");

  for (const entry of plan.allocations) {
    if (!entry.allocationId.trim() || ids.has(entry.allocationId)) issues.push(`allocation-id-invalid:${entry.allocationId}`);
    ids.add(entry.allocationId);
    if (!entry.beneficiaryClass.trim()) issues.push(`beneficiary-class-required:${entry.allocationId}`);
    if (!entry.custodyAddress.trim()) issues.push(`custody-address-required:${entry.allocationId}`);
    if (!Number.isInteger(entry.percentageBps) || entry.percentageBps < 0 || entry.percentageBps > 10_000) {
      issues.push(`percentage-bps-invalid:${entry.allocationId}`);
      continue;
    }
    if (entry.amountBaseUnits < 0n) issues.push(`allocation-amount-negative:${entry.allocationId}`);
    const floor = JARVIS_TOKEN.maximumBaseUnits * BigInt(entry.percentageBps) / 10_000n;
    const adjustment = entry.roundingAdjustmentBaseUnits ?? 0n;
    if (entry.amountBaseUnits !== floor + adjustment) issues.push(`allocation-amount-mismatch:${entry.allocationId}`);
    bps += entry.percentageBps;
    total += entry.amountBaseUnits;
    adjustmentTotal += adjustment;
  }

  const floors = plan.allocations.reduce(
    (sum, entry) => sum + JARVIS_TOKEN.maximumBaseUnits * BigInt(entry.percentageBps) / 10_000n,
    0n,
  );
  const requiredAdjustment = JARVIS_TOKEN.maximumBaseUnits - floors;
  if (adjustmentTotal !== requiredAdjustment) issues.push("rounding-adjustment-total-invalid");
  if (bps !== 10_000) issues.push("allocation-percentages-must-total-10000-bps");
  if (total !== JARVIS_TOKEN.maximumBaseUnits) issues.push("allocation-base-units-must-equal-fixed-supply");

  return { valid: issues.length === 0, issues, totalPercentageBps: bps, totalBaseUnits: total };
}

export function allocationCommitment(plan: AllocationPlan): string {
  const normalized = {
    ...plan,
    reviewers: [...plan.reviewers].sort(),
    allocations: [...plan.allocations]
      .map((entry) => ({
        ...entry,
        amountBaseUnits: entry.amountBaseUnits.toString(),
        roundingAdjustmentBaseUnits: (entry.roundingAdjustmentBaseUnits ?? 0n).toString(),
      }))
      .sort((a, b) => a.allocationId.localeCompare(b.allocationId)),
  };
  return canonicalSha256(normalized);
}
