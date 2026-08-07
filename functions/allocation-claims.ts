import { JarvisTokenError } from "../common/errors.ts";
import type { AllocationEntry } from "./allocation.ts";
import { claimableBaseUnitsAt, type VestingSchedule } from "./vesting.ts";

export interface AllocationClaimRequest {
  claimId: string;
  allocationId: string;
  beneficiary: string;
  amountBaseUnits: bigint;
  requestedAt: string;
}

export interface ExistingAllocationClaim {
  claimId: string;
  transactionId: string;
  amountBaseUnits: bigint;
}

export function authorizeAllocationClaim(
  allocation: AllocationEntry,
  schedule: VestingSchedule,
  request: AllocationClaimRequest,
  claimedBaseUnits: bigint,
  existingClaims: readonly ExistingAllocationClaim[] = [],
): void {
  if (!request.claimId.trim()) throw new JarvisTokenError("INVALID_ASSET", "Claim ID is required");
  if (request.allocationId !== allocation.allocationId || schedule.allocationId !== allocation.allocationId) {
    throw new JarvisTokenError("INVALID_ASSET", "Claim is not bound to the allocation");
  }
  if (!allocation.beneficiaryAddress) throw new JarvisTokenError("NOT_CONFIGURED", "Allocation beneficiary address is not configured");
  if (request.beneficiary !== allocation.beneficiaryAddress) throw new JarvisTokenError("SECURITY_POLICY_VIOLATION", "Claim beneficiary does not match approved allocation");
  if (request.amountBaseUnits <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Claim amount must be positive");
  if (existingClaims.some((claim) => claim.claimId === request.claimId)) throw new JarvisTokenError("STORAGE_CONFLICT", "Claim ID has already been used");
  const claimable = claimableBaseUnitsAt(schedule, claimedBaseUnits, request.requestedAt);
  if (request.amountBaseUnits > claimable) throw new JarvisTokenError("INVARIANT_VIOLATION", "Claim exceeds currently claimable vested amount");
}
