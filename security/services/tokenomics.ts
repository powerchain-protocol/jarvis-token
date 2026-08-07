import { JarvisTokenError } from "../common/errors.ts";
import { allocationCommitment, validateAllocationPlan, type AllocationPlan } from "../functions/allocation.ts";
import { authorizeAllocationClaim, type AllocationClaimRequest } from "../functions/allocation-claims.ts";
import { calculateCirculatingSupply, type CirculatingSupplyInput } from "../functions/circulation.ts";
import { type VestingSchedule } from "../functions/vesting.ts";
import { treasuryMovementCommitment, validateTreasuryMovement, type TreasuryMovement, type TreasuryPolicy } from "../functions/treasury.ts";

export interface AllocationClaimEvidence {
  claimId: string;
  allocationId: string;
  amountBaseUnits: bigint;
  beneficiary: string;
  transactionId: string;
  chain: "sui" | "solana";
  finalized: true;
  observedAt: string;
}

export interface TokenomicsRepository {
  getAllocationPlan(): Promise<AllocationPlan | null>;
  saveAllocationPlan(plan: AllocationPlan, commitment: string): Promise<void>;
  listAllocationClaims(allocationId: string): Promise<readonly AllocationClaimEvidence[]>;
  /** Must enforce unique claimId and transactionId in one database transaction. */
  saveAllocationClaim(evidence: AllocationClaimEvidence): Promise<void>;
  /** Must enforce unique movementId, commitment and transactionId atomically. */
  saveTreasuryMovement(movement: TreasuryMovement, commitment: string): Promise<void>;
}

export class JarvisTokenomicsService {
  private readonly repository: TokenomicsRepository;
  constructor(repository: TokenomicsRepository) { this.repository = repository; }

  async approveAllocationPlan(plan: AllocationPlan): Promise<string> {
    const report = validateAllocationPlan(plan, true);
    if (!report.valid) throw new JarvisTokenError("INVARIANT_VIOLATION", "Allocation plan failed validation", { issues: report.issues });
    const commitment = allocationCommitment(plan);
    await this.repository.saveAllocationPlan(plan, commitment);
    return commitment;
  }

  async authorizeClaim(schedule: VestingSchedule, request: AllocationClaimRequest): Promise<void> {
    const plan = await this.repository.getAllocationPlan();
    if (!plan || plan.status !== "approved") throw new JarvisTokenError("NOT_VERIFIED", "No approved allocation plan is active");
    const allocation = plan.allocations.find((entry) => entry.allocationId === request.allocationId);
    if (!allocation) throw new JarvisTokenError("INVALID_ASSET", "Unknown allocation");
    const claims = await this.repository.listAllocationClaims(request.allocationId);
    const claimed = claims.reduce((sum, claim) => sum + claim.amountBaseUnits, 0n);
    authorizeAllocationClaim(allocation, schedule, request, claimed, claims);
  }

  async recordFinalizedClaim(evidence: AllocationClaimEvidence): Promise<void> {
    if (!evidence.finalized || !evidence.transactionId.trim()) throw new JarvisTokenError("NOT_VERIFIED", "Only finalized claims with transaction evidence may be persisted");
    await this.repository.saveAllocationClaim(evidence);
  }

  async recordTreasuryMovement(movement: TreasuryMovement, policy?: TreasuryPolicy): Promise<string> {
    validateTreasuryMovement(movement, Date.now(), policy);
    const commitment = treasuryMovementCommitment(movement);
    await this.repository.saveTreasuryMovement(movement, commitment);
    return commitment;
  }

  circulating(input: CirculatingSupplyInput) { return calculateCirculatingSupply(input); }
}
