import { z } from "zod";
import { positiveJarvisAmountSchema } from "./amounts.js";
import { TOKEN } from "./constants.js";
import { canonicalJson, compareCanonicalText, sha256CanonicalJson } from "./utils/canonical-json.js";
import { assertChainNetwork, parseSolanaAddress, parseSolanaTransactionSignature, parseSuiAddressOrObject, parseSuiTransactionDigest } from "./utils/chains.js";
import { blockFinalityAnchorSchema, validateBlockFinalityAnchor } from "./blockchains.js";

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
  custodyBinding: z.object({
    chain: z.enum(["sui", "solana"]),
    network: z.string().min(1),
    assetId: z.string().min(3),
    address: z.string().min(3),
  }).optional(),
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
  if (entry.custodyBinding) {
    const binding = entry.custodyBinding;
    if (binding.address !== entry.custodyAddress) context.addIssue({ code: "custom", path: ["custodyBinding", "address"], message: "custody binding address must equal custody address" });
    try { assertChainNetwork(binding.chain, binding.network); } catch { context.addIssue({ code: "custom", path: ["custodyBinding", "network"], message: "custody network is invalid for chain" }); }
    if (binding.chain === "sui") {
      try { parseSuiAddressOrObject(binding.address); } catch { context.addIssue({ code: "custom", path: ["custodyBinding", "address"], message: "invalid Sui custody address" }); }
      if (!/^0x[0-9a-fA-F]{64}::jarvis::JARVIS$/.test(binding.assetId)) context.addIssue({ code: "custom", path: ["custodyBinding", "assetId"], message: "invalid Sui custody JARVIS coin type" });
    } else {
      for (const [path, value] of [["address", binding.address], ["assetId", binding.assetId]] as const) {
        try { if (parseSolanaAddress(value) !== value) throw new Error("non-canonical public key"); } catch { context.addIssue({ code: "custom", path: ["custodyBinding", path], message: `invalid Solana custody ${path}` }); }
      }
    }
  }
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

/** Creates an order-independent commitment and public reconciliation summary. */
export function buildAllocationCommitment(input: unknown) {
  const plan = validateApprovedAllocationPlan(input);
  const normalized = {
    ...plan,
    reviewers: [...plan.reviewers].sort(compareCanonicalText),
    allocations: [...plan.allocations]
      .map((allocation) => ({
        ...allocation,
        vesting: allocation.vesting.milestones
          ? { ...allocation.vesting, milestones: [...allocation.vesting.milestones].sort((left, right) => compareCanonicalText(left.milestoneId, right.milestoneId)) }
          : { ...allocation.vesting },
      }))
      .sort((left, right) => compareCanonicalText(left.allocationId, right.allocationId)),
  };
  const digest = sha256CanonicalJson(normalized);
  const policyDigest = sha256CanonicalJson(TOKENOMICS_POLICY);
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
    categoryTotals: Object.fromEntries([...categories.entries()].sort(([left], [right]) => compareCanonicalText(left, right)).map(([category, total]) => [category, { percentageBps: total.percentageBps, amountBaseUnits: total.amountBaseUnits.toString() }])),
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

export const finalizedAllocationClaimEventSchema = allocationClaimEventSchema.extend({
  chain: z.enum(["sui", "solana"]),
  network: z.string().min(1),
  assetId: z.string().min(3),
  from: z.string().min(3),
  to: z.string().min(3),
  finalized: z.literal(true),
  success: z.literal(true),
  observedAt: z.iso.datetime(),
  blockAnchor: blockFinalityAnchorSchema,
}).superRefine((event, context) => {
  try { assertChainNetwork(event.chain, event.network); } catch { context.addIssue({ code: "custom", path: ["network"], message: "network is invalid for claim chain" }); }
  if (Date.parse(event.observedAt) < Date.parse(event.claimedAt)) context.addIssue({ code: "custom", path: ["observedAt"], message: "claim observation predates claim" });
  if (event.from === event.to) context.addIssue({ code: "custom", path: ["to"], message: "claim source and recipient must differ" });
  try { validateBlockFinalityAnchor(event.blockAnchor, event.chain, event.network); }
  catch { context.addIssue({ code: "custom", path: ["blockAnchor"], message: "claim block anchor does not match chain and network" }); }
  if (event.chain === "sui") {
    try { parseSuiAddressOrObject(event.from); } catch { context.addIssue({ code: "custom", path: ["from"], message: "invalid Sui claim source" }); }
    try { parseSuiAddressOrObject(event.to); } catch { context.addIssue({ code: "custom", path: ["to"], message: "invalid Sui claim recipient" }); }
    try { parseSuiTransactionDigest(event.transactionId); } catch { context.addIssue({ code: "custom", path: ["transactionId"], message: "invalid Sui claim transaction digest" }); }
    if (!/^0x[0-9a-fA-F]{64}::jarvis::JARVIS$/.test(event.assetId)) context.addIssue({ code: "custom", path: ["assetId"], message: "invalid Sui JARVIS coin type" });
  } else {
    for (const [path, value] of [["from", event.from], ["to", event.to], ["assetId", event.assetId]] as const) {
      try { if (parseSolanaAddress(value) !== value) throw new Error("non-canonical public key"); } catch { context.addIssue({ code: "custom", path: [path], message: `invalid Solana claim ${path}` }); }
    }
    try { parseSolanaTransactionSignature(event.transactionId); } catch { context.addIssue({ code: "custom", path: ["transactionId"], message: "invalid Solana claim transaction signature" }); }
  }
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
  const rawClaims = z.array(z.unknown()).parse(claimsInput);
  const firstClaim = rawClaims[0];
  const eventMode = firstClaim !== undefined && typeof firstClaim === "object" && firstClaim !== null && "claimId" in firstClaim;
  const finalizedMode = eventMode && "chain" in firstClaim;
  const parsedClaims = finalizedMode
    ? z.array(finalizedAllocationClaimEventSchema).parse(rawClaims)
    : eventMode ? z.array(allocationClaimEventSchema).parse(rawClaims) : z.array(allocationClaimSchema).parse(rawClaims);
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
  const sortedEvents = [...events].sort((left, right) => compareCanonicalText(left.claimedAt, right.claimedAt) || compareCanonicalText(left.claimId, right.claimId));
  const includedEvents: typeof sortedEvents = [];
  for (const event of sortedEvents) {
    if (!knownIds.has(event.allocationId)) throw new Error(`claim references unknown allocation: ${event.allocationId}`);
    if (Date.parse(event.claimedAt) < Date.parse(plan.approvedAt!)) throw new Error(`claim event predates allocation approval: ${event.claimId}`);
    if (claimIds.has(event.claimId)) throw new Error(`duplicate claim event ID: ${event.claimId}`);
    if (transactionIds.has(event.transactionId)) throw new Error(`duplicate claim transaction ID: ${event.transactionId}`);
    claimIds.add(event.claimId); transactionIds.add(event.transactionId);
    const entry = plan.allocations.find((allocation) => allocation.allocationId === event.allocationId)!;
    if (finalizedMode) {
      const finalized = event as z.infer<typeof finalizedAllocationClaimEventSchema>;
      const binding = entry.custodyBinding;
      if (!binding) throw new Error(`finalized claim requires allocation custody binding: ${event.claimId}`);
      if (finalized.from !== binding.address || finalized.chain !== binding.chain || finalized.network !== binding.network || finalized.assetId !== binding.assetId) throw new Error(`claim chain, network, asset, or source does not match allocation custody binding: ${event.claimId}`);
    }
    const cumulative = (validationClaimMap.get(event.allocationId) ?? 0n) + BigInt(event.amountBaseUnits);
    if (cumulative > vestedAmountAt(entry, Date.parse(event.claimedAt))) throw new Error(`claim event exceeds vested amount: ${event.claimId}`);
    validationClaimMap.set(event.allocationId, cumulative);
    const evidenceTime = finalizedMode ? Date.parse((event as z.infer<typeof finalizedAllocationClaimEventSchema>).observedAt) : Date.parse(event.claimedAt);
    if (evidenceTime <= at) {
      claimMap.set(event.allocationId, (claimMap.get(event.allocationId) ?? 0n) + BigInt(event.amountBaseUnits));
      includedEvents.push(event);
    }
  }

  let totalVested = 0n; let totalClaimed = 0n;
  const categories = new Map<string, { vested: bigint; claimed: bigint; allocation: bigint }>();
  const allocations = [...plan.allocations].sort((left, right) => compareCanonicalText(left.allocationId, right.allocationId)).map((entry) => {
    const amount = BigInt(entry.amountBaseUnits); const vested = vestedAmountAt(entry, at);
    const claimed = claimMap.get(entry.allocationId) ?? 0n;
    if (claimed > vested) throw new Error(`claimed amount exceeds vested amount: ${entry.allocationId}`);
    totalVested += vested; totalClaimed += claimed;
    const category = categories.get(entry.category) ?? { vested: 0n, claimed: 0n, allocation: 0n };
    category.vested += vested; category.claimed += claimed; category.allocation += amount; categories.set(entry.category, category);
    return { allocationId: entry.allocationId, category: entry.category, amountBaseUnits: entry.amountBaseUnits, vestedBaseUnits: vested.toString(), claimedBaseUnits: claimed.toString(), claimableBaseUnits: (vested - claimed).toString(), unvestedBaseUnits: (amount - vested).toString() };
  });
  const categoryTotals = Object.fromEntries([...categories.entries()].sort(([left], [right]) => compareCanonicalText(left, right)).map(([category, value]) => [category, { amountBaseUnits: value.allocation.toString(), vestedBaseUnits: value.vested.toString(), claimedBaseUnits: value.claimed.toString(), claimableBaseUnits: (value.vested - value.claimed).toString(), unvestedBaseUnits: (value.allocation - value.vested).toString() }]));
  const claimLedgerSha256 = sha256CanonicalJson(eventMode ? includedEvents : claims.sort((left, right) => compareCanonicalText(left.allocationId, right.allocationId)));
  const snapshot = { schemaVersion: 1, tokenVersion: TOKEN.version, asOf, claimEvidenceMode: finalizedMode ? "finalized-chain-events" : eventMode ? "transaction-events-legacy" : "aggregate-legacy", includedClaimEventCount: eventMode ? includedEvents.length : null, claimLedgerSha256, allocationCommitmentSha256: buildAllocationCommitment(plan).allocationCommitmentSha256, totalSupplyBaseUnits: TOKEN.maximumBaseUnits.toString(), vestedBaseUnits: totalVested.toString(), claimedBaseUnits: totalClaimed.toString(), claimableBaseUnits: (totalVested - totalClaimed).toString(), unvestedBaseUnits: (TOKEN.maximumBaseUnits - totalVested).toString(), categoryTotals, allocations };
  return { ...snapshot, snapshotSha256: sha256CanonicalJson(snapshot) };
}

const vestingSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  tokenVersion: z.literal(TOKEN.version),
  asOf: z.iso.datetime(),
  claimEvidenceMode: z.enum(["finalized-chain-events", "transaction-events-legacy", "aggregate-legacy"]),
  includedClaimEventCount: z.number().int().nonnegative().nullable(),
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
  if (requireTransactionEvents && supplied.claimEvidenceMode !== "finalized-chain-events") throw new Error("strict verification requires finalized chain claim events");
  const expected = buildVestingSnapshot(planInput, supplied.asOf, claimsInput);
  if (canonicalJson(supplied) !== canonicalJson(expected)) throw new Error("vesting snapshot does not match recomputed source evidence");
  return {
    verified: true,
    asOf: supplied.asOf,
    claimEvidenceMode: supplied.claimEvidenceMode,
    allocationCommitmentSha256: supplied.allocationCommitmentSha256,
    claimLedgerSha256: supplied.claimLedgerSha256,
    snapshotSha256: supplied.snapshotSha256,
  } as const;
}
