import { JarvisTokenError } from "../common/errors.ts";
import { canonicalSha256 } from "../utils/checksums.ts";

export type TreasuryPurpose = "allocation" | "liquidity" | "operations" | "incentive" | "reserve" | "bridge-custody" | "other";

export interface TreasuryPolicy {
  minimumApprovals: number;
  timelockSeconds: number;
  maxMovementBaseUnits?: bigint;
  allowedPurposes?: readonly TreasuryPurpose[];
}

export interface TreasuryMovement {
  movementId: string;
  purpose: TreasuryPurpose;
  amountBaseUnits: bigint;
  from: string;
  to: string;
  allocationId?: string;
  governanceRecord: string;
  approvedBy: readonly string[];
  approvedAt: string;
  executableAt?: string;
  expiresAt?: string;
  executedAt?: string;
  transactionId?: string;
}

export function validateTreasuryMovement(
  movement: TreasuryMovement,
  now = Date.now(),
  policy: TreasuryPolicy = { minimumApprovals: 2, timelockSeconds: 0 },
): void {
  if (!movement.movementId.trim() || !movement.from.trim() || !movement.to.trim()) throw new JarvisTokenError("INVALID_ASSET", "Treasury movement identity is incomplete");
  if (movement.from === movement.to) throw new JarvisTokenError("INVALID_ASSET", "Treasury source and destination must differ");
  if (movement.amountBaseUnits <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Treasury amount must be positive");
  if (!movement.governanceRecord.trim()) throw new JarvisTokenError("NOT_VERIFIED", "Treasury movement requires a governance record");
  if (!Number.isInteger(policy.minimumApprovals) || policy.minimumApprovals < 2) throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Treasury policy must require at least two approvals");
  if (new Set(movement.approvedBy).size < policy.minimumApprovals) throw new JarvisTokenError("NOT_VERIFIED", policy.minimumApprovals === 2
    ? "Treasury movement requires two independent approvals"
    : `Treasury movement requires ${policy.minimumApprovals} independent approvals`);
  if (policy.maxMovementBaseUnits !== undefined && movement.amountBaseUnits > policy.maxMovementBaseUnits) throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Treasury movement exceeds policy limit");
  if (policy.allowedPurposes && !policy.allowedPurposes.includes(movement.purpose)) throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Treasury movement purpose is not allowed");

  const approved = Date.parse(movement.approvedAt);
  if (!Number.isFinite(approved)) throw new JarvisTokenError("INVALID_ASSET", "Treasury approval timestamp is invalid");
  const requiredExecutableAt = approved + policy.timelockSeconds * 1000;
  const executableAt = movement.executableAt ? Date.parse(movement.executableAt) : requiredExecutableAt;
  if (!Number.isFinite(executableAt) || executableAt < requiredExecutableAt) throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Treasury executable time violates timelock");
  if (movement.executedAt && Date.parse(movement.executedAt) < executableAt) throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Treasury movement executed before timelock elapsed");
  if (!movement.executedAt && now < executableAt) throw new JarvisTokenError("NOT_VERIFIED", "Treasury movement timelock has not elapsed");

  if (movement.expiresAt) {
    const expires = Date.parse(movement.expiresAt);
    if (!Number.isFinite(expires) || expires <= executableAt) throw new JarvisTokenError("INVALID_ASSET", "Treasury expiry must follow executable time");
    if (!movement.executedAt && expires <= now) throw new JarvisTokenError("NOT_VERIFIED", "Treasury movement approval has expired");
  }
  if (movement.executedAt && !movement.transactionId) throw new JarvisTokenError("NOT_VERIFIED", "Executed treasury movements require a transaction ID");
}

export function treasuryMovementCommitment(movement: TreasuryMovement): string {
  return canonicalSha256({
    ...movement,
    amountBaseUnits: movement.amountBaseUnits.toString(),
    approvedBy: [...movement.approvedBy].sort(),
  });
}
