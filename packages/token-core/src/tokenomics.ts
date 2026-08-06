import { z } from "zod";
import { createHash } from "node:crypto";
import { positiveJarvisAmountSchema } from "./amounts.js";
import { TOKEN } from "./constants.js";

const allocationCategorySchema = z.enum([
  "ecosystem-public", "team-contributors", "development-operations", "treasury",
  "liquidity", "marketing-partnerships", "reserve", "ai-user-incentives",
]);
const placeholder = /placeholder|replace|tbd|todo|example/i;
const identity = z.string().min(3).refine((value) => !placeholder.test(value), "placeholder identity is not permitted");
const governanceIdentity = z.string().min(8).refine((value) => !placeholder.test(value), "placeholder governance record is not permitted");

export const TOKENOMICS_POLICY = Object.freeze({
  schemaVersion: 1,
  tokenVersion: TOKEN.version,
  name: TOKEN.name,
  symbol: TOKEN.symbol,
  decimals: TOKEN.decimals,
  maximumWholeSupply: TOKEN.maximumWholeSupply.toString(),
  maximumBaseUnits: TOKEN.maximumBaseUnits.toString(),
  canonicalChain: "sui",
  solanaRole: "wrapped",
  monetaryModel: "fixed",
  initialAllocation: "single-configured-treasury",
  finalAllocationStatus: "unapproved",
} as const);

export const allocationEntrySchema = z.object({
  allocationId: z.string().min(8),
  category: allocationCategorySchema,
  percentageBps: z.number().int().positive().max(10_000),
  amountBaseUnits: positiveJarvisAmountSchema,
  beneficiaryClass: identity,
  custodyAddress: identity,
  locked: z.boolean(),
  vesting: z.object({
    curve: z.enum(["immediate", "linear", "milestone"]),
    startAt: z.iso.datetime(),
    cliffAt: z.iso.datetime().optional(),
    endAt: z.iso.datetime(),
    enforcementMechanism: z.string().min(8),
    milestones: z.array(z.object({
      milestoneId: z.string().min(8),
      unlockAt: z.iso.datetime(),
      amountBaseUnits: positiveJarvisAmountSchema,
    })).optional(),
  }),
}).superRefine((entry, context) => {
  const start = Date.parse(entry.vesting.startAt); const end = Date.parse(entry.vesting.endAt);
  if (end < start) context.addIssue({ code: "custom", path: ["vesting", "endAt"], message: "vesting end must not precede start" });
  if (entry.vesting.curve !== "immediate" && end === start) context.addIssue({ code: "custom", path: ["vesting", "endAt"], message: "non-immediate vesting requires a positive duration" });
  if (entry.vesting.cliffAt) {
    const cliff = Date.parse(entry.vesting.cliffAt);
    if (cliff < start || cliff > end) context.addIssue({ code: "custom", path: ["vesting", "cliffAt"], message: "vesting cliff must fall between start and end" });
  }
  if (entry.locked && entry.vesting.curve === "immediate") context.addIssue({ code: "custom", path: ["vesting", "curve"], message: "locked allocation cannot vest immediately" });
  if (!entry.locked && entry.vesting.curve !== "immediate") context.addIssue({ code: "custom", path: ["vesting", "curve"], message: "unlocked allocation must use immediate vesting" });
  const milestones = entry.vesting.milestones ?? [];
  if (entry.vesting.curve === "milestone") {
    if (milestones.length === 0) context.addIssue({ code: "custom", path: ["vesting", "milestones"], message: "milestone vesting requires milestones" });
    const milestoneIds = new Set<string>(); let milestoneTotal = 0n;
    for (const [index, milestone] of milestones.entries()) {
      if (milestoneIds.has(milestone.milestoneId)) context.addIssue({ code: "custom", path: ["vesting", "milestones", index, "milestoneId"], message: "duplicate milestone ID" });
      milestoneIds.add(milestone.milestoneId);
      const unlock = Date.parse(milestone.unlockAt);
      if (unlock < start || unlock > end) context.addIssue({ code: "custom", path: ["vesting", "milestones", index, "unlockAt"], message: "milestone unlock must fall between start and end" });
      milestoneTotal += BigInt(milestone.amountBaseUnits);
    }
    if (milestoneTotal !== BigInt(entry.amountBaseUnits)) context.addIssue({ code: "custom", path: ["vesting", "milestones"], message: "milestone amounts must equal allocation amount" });
  } else if (milestones.length > 0) context.addIssue({ code: "custom", path: ["vesting", "milestones"], message: "milestones are only valid for milestone vesting" });
});

export const allocationPlanSchema = z.object({
  schemaVersion: z.literal(1),
  tokenVersion: z.literal(TOKEN.version),
  status: z.enum(["draft", "approved"]),
  governanceRecord: governanceIdentity,
  approvedAt: z.iso.datetime().nullable(),
  reviewers: z.array(identity),
  allocations: z.array(allocationEntrySchema).min(1),
}).superRefine((plan, context) => {
  const ids = new Set<string>(); let bps = 0; let total = 0n;
  for (const [index, entry] of plan.allocations.entries()) {
    if (ids.has(entry.allocationId)) context.addIssue({ code: "custom", path: ["allocations", index, "allocationId"], message: "duplicate allocation ID" });
    ids.add(entry.allocationId); bps += entry.percentageBps; total += BigInt(entry.amountBaseUnits);
    const expected = TOKEN.maximumBaseUnits * BigInt(entry.percentageBps) / 10_000n;
    if (BigInt(entry.amountBaseUnits) !== expected) context.addIssue({ code: "custom", path: ["allocations", index, "amountBaseUnits"], message: "allocation amount does not match percentage basis points" });
  }
  if (bps !== 10_000) context.addIssue({ code: "custom", path: ["allocations"], message: "allocation percentages must total exactly 10000 basis points" });
  if (total !== TOKEN.maximumBaseUnits) context.addIssue({ code: "custom", path: ["allocations"], message: "allocation amounts must equal the fixed JARVIS supply" });
  if (new Set(plan.reviewers).size !== plan.reviewers.length) context.addIssue({ code: "custom", path: ["reviewers"], message: "allocation reviewers must be unique" });
});

export type AllocationPlan = z.infer<typeof allocationPlanSchema>;

export function validateApprovedAllocationPlan(input: unknown): AllocationPlan {
  const plan = allocationPlanSchema.parse(input);
  if (plan.status !== "approved" || plan.approvedAt === null) throw new Error("allocation plan is not approved");
  if (plan.reviewers.length < 2) throw new Error("approved allocation requires two independent reviewers");
  return plan;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

/** Creates an order-independent commitment and public reconciliation summary. */
export function buildAllocationCommitment(input: unknown) {
  const plan = validateApprovedAllocationPlan(input);
  const normalized = {
    ...plan,
    reviewers: [...plan.reviewers].sort(),
    allocations: [...plan.allocations]
      .map((allocation) => ({ ...allocation, vesting: { ...allocation.vesting, milestones: allocation.vesting.milestones ? [...allocation.vesting.milestones].sort((left, right) => left.milestoneId.localeCompare(right.milestoneId)) : undefined } }))
      .sort((left, right) => left.allocationId.localeCompare(right.allocationId)),
  };
  const digest = createHash("sha256").update(canonical(normalized)).digest("hex");
  const policyDigest = createHash("sha256").update(canonical(TOKENOMICS_POLICY)).digest("hex");
  const categories = new Map<string, { percentageBps: number; amountBaseUnits: bigint }>();
  for (const allocation of normalized.allocations) {
    const current = categories.get(allocation.category) ?? { percentageBps: 0, amountBaseUnits: 0n };
    current.percentageBps += allocation.percentageBps;
    current.amountBaseUnits += BigInt(allocation.amountBaseUnits);
    categories.set(allocation.category, current);
  }
  return {
    schemaVersion: 1,
    tokenVersion: TOKEN.version,
    algorithm: "sha256",
    allocationCommitmentSha256: digest,
    tokenomicsPolicySha256: policyDigest,
    governanceRecord: plan.governanceRecord,
    approvedAt: plan.approvedAt,
    allocationCount: plan.allocations.length,
    reviewerCount: plan.reviewers.length,
    totalPercentageBps: 10_000,
    totalBaseUnits: TOKEN.maximumBaseUnits.toString(),
    categoryTotals: Object.fromEntries([...categories.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([category, total]) => [category, { percentageBps: total.percentageBps, amountBaseUnits: total.amountBaseUnits.toString() }])),
  };
}

export const allocationClaimSchema = z.object({
  allocationId: z.string().min(8),
  claimedBaseUnits: z.string().regex(/^(0|[1-9][0-9]*)$/),
});

export const allocationClaimEventSchema = z.object({
  claimId: z.string().min(8),
  allocationId: z.string().min(8),
  amountBaseUnits: positiveJarvisAmountSchema,
  claimedAt: z.iso.datetime(),
  transactionId: identity,
});

function vestedAmountAt(entry: z.infer<typeof allocationEntrySchema>, at: number): bigint {
  const amount = BigInt(entry.amountBaseUnits); const start = Date.parse(entry.vesting.startAt); const end = Date.parse(entry.vesting.endAt);
  if (entry.vesting.curve === "immediate") return at >= start ? amount : 0n;
  if (entry.vesting.curve === "linear") {
    const cliff = entry.vesting.cliffAt ? Date.parse(entry.vesting.cliffAt) : start;
    if (at < cliff) return 0n;
    return at >= end ? amount : amount * BigInt(Math.max(0, at - start)) / BigInt(end - start);
  }
  return (entry.vesting.milestones ?? []).reduce((sum, milestone) => at >= Date.parse(milestone.unlockAt) ? sum + BigInt(milestone.amountBaseUnits) : sum, 0n);
}

/** Calculates vested, claimed, and remaining amounts without using floating point arithmetic. */
export function buildVestingSnapshot(planInput: unknown, asOfInput: string, claimsInput: unknown = []) {
  const plan = validateApprovedAllocationPlan(planInput);
  const asOf = z.iso.datetime().parse(asOfInput); const at = Date.parse(asOf);
  const parsedClaims = z.union([z.array(allocationClaimEventSchema), z.array(allocationClaimSchema)]).parse(claimsInput);
  const eventMode = parsedClaims.length > 0 && "claimId" in parsedClaims[0]!;
  const claims = eventMode ? [] : parsedClaims as z.infer<typeof allocationClaimSchema>[];
  const events = eventMode ? parsedClaims as z.infer<typeof allocationClaimEventSchema>[] : [];
  const claimMap = new Map<string, bigint>();
  for (const claim of claims) {
    if (claimMap.has(claim.allocationId)) throw new Error("duplicate allocation claim ID");
    claimMap.set(claim.allocationId, BigInt(claim.claimedBaseUnits));
  }
  const knownIds = new Set(plan.allocations.map((entry) => entry.allocationId));
  for (const id of claimMap.keys()) if (!knownIds.has(id)) throw new Error(`claim references unknown allocation: ${id}`);
  const claimIds = new Set<string>(); const transactionIds = new Set<string>(); const validationClaimMap = new Map<string, bigint>();
  const sortedEvents = [...events].sort((left, right) => left.claimedAt.localeCompare(right.claimedAt) || left.claimId.localeCompare(right.claimId));
  for (const event of sortedEvents) {
    if (!knownIds.has(event.allocationId)) throw new Error(`claim references unknown allocation: ${event.allocationId}`);
    if (claimIds.has(event.claimId)) throw new Error(`duplicate claim event ID: ${event.claimId}`);
    if (transactionIds.has(event.transactionId)) throw new Error(`duplicate claim transaction ID: ${event.transactionId}`);
    claimIds.add(event.claimId); transactionIds.add(event.transactionId);
    const entry = plan.allocations.find((allocation) => allocation.allocationId === event.allocationId)!;
    const cumulative = (validationClaimMap.get(event.allocationId) ?? 0n) + BigInt(event.amountBaseUnits);
    if (cumulative > vestedAmountAt(entry, Date.parse(event.claimedAt))) throw new Error(`claim event exceeds vested amount: ${event.claimId}`);
    validationClaimMap.set(event.allocationId, cumulative);
    if (Date.parse(event.claimedAt) <= at) claimMap.set(event.allocationId, cumulative);
  }

  let totalVested = 0n; let totalClaimed = 0n;
  const categories = new Map<string, { vested: bigint; claimed: bigint; allocation: bigint }>();
  const allocations = [...plan.allocations].sort((left, right) => left.allocationId.localeCompare(right.allocationId)).map((entry) => {
    const amount = BigInt(entry.amountBaseUnits); const vested = vestedAmountAt(entry, at);
    const claimed = claimMap.get(entry.allocationId) ?? 0n;
    if (claimed > vested) throw new Error(`claimed amount exceeds vested amount: ${entry.allocationId}`);
    totalVested += vested; totalClaimed += claimed;
    const category = categories.get(entry.category) ?? { vested: 0n, claimed: 0n, allocation: 0n };
    category.vested += vested; category.claimed += claimed; category.allocation += amount; categories.set(entry.category, category);
    return { allocationId: entry.allocationId, category: entry.category, amountBaseUnits: entry.amountBaseUnits, vestedBaseUnits: vested.toString(), claimedBaseUnits: claimed.toString(), claimableBaseUnits: (vested - claimed).toString(), unvestedBaseUnits: (amount - vested).toString() };
  });
  const categoryTotals = Object.fromEntries([...categories.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([category, value]) => [category, { amountBaseUnits: value.allocation.toString(), vestedBaseUnits: value.vested.toString(), claimedBaseUnits: value.claimed.toString(), claimableBaseUnits: (value.vested - value.claimed).toString(), unvestedBaseUnits: (value.allocation - value.vested).toString() }]));
  const claimLedgerSha256 = createHash("sha256").update(canonical(eventMode ? sortedEvents : claims.sort((left, right) => left.allocationId.localeCompare(right.allocationId)))).digest("hex");
  const snapshot = { schemaVersion: 1, tokenVersion: TOKEN.version, asOf, claimEvidenceMode: eventMode ? "transaction-events" : "aggregate-legacy", claimLedgerSha256, allocationCommitmentSha256: buildAllocationCommitment(plan).allocationCommitmentSha256, totalSupplyBaseUnits: TOKEN.maximumBaseUnits.toString(), vestedBaseUnits: totalVested.toString(), claimedBaseUnits: totalClaimed.toString(), claimableBaseUnits: (totalVested - totalClaimed).toString(), unvestedBaseUnits: (TOKEN.maximumBaseUnits - totalVested).toString(), categoryTotals, allocations };
  return { ...snapshot, snapshotSha256: createHash("sha256").update(canonical(snapshot)).digest("hex") };
}

const vestingSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  tokenVersion: z.literal(TOKEN.version),
  asOf: z.iso.datetime(),
  claimEvidenceMode: z.enum(["transaction-events", "aggregate-legacy"]),
  claimLedgerSha256: z.string().regex(/^[a-f0-9]{64}$/),
  allocationCommitmentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  totalSupplyBaseUnits: z.string(),
  vestedBaseUnits: z.string(),
  claimedBaseUnits: z.string(),
  claimableBaseUnits: z.string(),
  unvestedBaseUnits: z.string(),
  categoryTotals: z.record(z.string(), z.object({
    amountBaseUnits: z.string(), vestedBaseUnits: z.string(), claimedBaseUnits: z.string(), claimableBaseUnits: z.string(), unvestedBaseUnits: z.string(),
  })),
  allocations: z.array(z.object({
    allocationId: z.string(), category: allocationCategorySchema, amountBaseUnits: z.string(), vestedBaseUnits: z.string(), claimedBaseUnits: z.string(), claimableBaseUnits: z.string(), unvestedBaseUnits: z.string(),
  })),
  snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

/** Recomputes a published snapshot from its approved plan and complete claim evidence. */
export function verifyVestingSnapshot(snapshotInput: unknown, planInput: unknown, claimsInput: unknown, requireTransactionEvents = true) {
  const supplied = vestingSnapshotSchema.parse(snapshotInput);
  if (requireTransactionEvents && supplied.claimEvidenceMode !== "transaction-events") throw new Error("strict verification requires transaction claim events");
  const expected = buildVestingSnapshot(planInput, supplied.asOf, claimsInput);
  if (canonical(supplied) !== canonical(expected)) throw new Error("vesting snapshot does not match recomputed source evidence");
  return {
    verified: true,
    asOf: supplied.asOf,
    claimEvidenceMode: supplied.claimEvidenceMode,
    allocationCommitmentSha256: supplied.allocationCommitmentSha256,
    claimLedgerSha256: supplied.claimLedgerSha256,
    snapshotSha256: supplied.snapshotSha256,
  } as const;
}
