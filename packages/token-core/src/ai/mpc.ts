import { z } from "zod";
import { jarvisAmountSchema } from "../amounts.js";

export const mpcPolicySchema = z.object({
  policyId: z.string().min(8), participants: z.array(z.string().min(3)).min(2), threshold: z.number().int().min(2),
  allowedOperations: z.array(z.enum(["ai-settlement", "bridge-pause", "treasury-transfer"])).min(1),
  maximumPaymentBaseUnits: jarvisAmountSchema,
}).superRefine((policy, context) => {
  if (new Set(policy.participants).size !== policy.participants.length) context.addIssue({ code: "custom", path: ["participants"], message: "MPC participants must be unique" });
  if (policy.threshold > new Set(policy.participants).size) context.addIssue({ code: "custom", path: ["threshold"], message: "MPC threshold exceeds participants" });
});

export interface MpcProposal { proposalId: string; policyId: string; operation: "ai-settlement" | "bridge-pause" | "treasury-transfer"; amountBaseUnits: string; payloadDigest: string; expiresAt: string; approvals: string[]; status: "pending" | "approved" | "expired"; }
const proposalInputSchema = z.object({
  proposalId: z.string().min(8), policyId: z.string().min(8), operation: z.enum(["ai-settlement", "bridge-pause", "treasury-transfer"]),
  amountBaseUnits: jarvisAmountSchema, payloadDigest: z.string().min(32), expiresAt: z.iso.datetime(),
});
function validateOperationAmount(operation: MpcProposal["operation"], amountBaseUnits: string): void {
  const amount = BigInt(amountBaseUnits);
  if (operation === "bridge-pause" && amount !== 0n) throw new Error("bridge-pause proposal amount must be zero");
  if (operation !== "bridge-pause" && amount === 0n) throw new Error("payment proposal amount must be positive");
}
export function createMpcProposal(input: Omit<MpcProposal, "approvals" | "status">, policyInput: unknown, createdAt: string): MpcProposal {
  const policy = mpcPolicySchema.parse(policyInput); const proposal = proposalInputSchema.parse(input); z.iso.datetime().parse(createdAt);
  if (proposal.policyId !== policy.policyId) throw new Error("MPC policy mismatch");
  if (!policy.allowedOperations.includes(proposal.operation)) throw new Error("operation not allowed by MPC policy");
  validateOperationAmount(proposal.operation, proposal.amountBaseUnits);
  if (BigInt(proposal.amountBaseUnits) > BigInt(policy.maximumPaymentBaseUnits)) throw new Error("proposal exceeds MPC payment limit");
  if (Date.parse(proposal.expiresAt) <= Date.parse(createdAt)) throw new Error("proposal expiry must be in the future");
  return { ...proposal, approvals: [], status: "pending" };
}
export function approveMpcProposal(proposal: MpcProposal, participant: string, policyInput: unknown, approvedAt: string): MpcProposal {
  const policy = mpcPolicySchema.parse(policyInput); z.iso.datetime().parse(approvedAt);
  proposalInputSchema.parse(proposal);
  validateOperationAmount(proposal.operation, proposal.amountBaseUnits);
  if (proposal.policyId !== policy.policyId) throw new Error("MPC policy mismatch");
  if (!policy.allowedOperations.includes(proposal.operation) || BigInt(proposal.amountBaseUnits) > BigInt(policy.maximumPaymentBaseUnits)) throw new Error("persisted MPC proposal violates policy");
  const prior = new Set(proposal.approvals);
  if (prior.size !== proposal.approvals.length) throw new Error("duplicate persisted MPC approvals");
  if ([...prior].some((item) => !policy.participants.includes(item))) throw new Error("unknown persisted MPC participant");
  if (prior.size >= policy.threshold && proposal.status === "pending") throw new Error("inconsistent pending MPC proposal threshold");
  if (proposal.status !== "pending") throw new Error("MPC proposal is terminal");
  if (Date.parse(approvedAt) >= Date.parse(proposal.expiresAt)) return { ...proposal, status: "expired" };
  if (!policy.participants.includes(participant)) throw new Error("unknown MPC participant");
  if (proposal.approvals.includes(participant)) throw new Error("duplicate MPC approval");
  const approvals = [...proposal.approvals, participant];
  return { ...proposal, approvals, status: approvals.length >= policy.threshold ? "approved" : "pending" };
}

/** Revalidates serialized approval state; never trust a caller-supplied approved flag. */
export function verifyMpcProposalApproval(proposal: MpcProposal, policyInput: unknown, now: string): void {
  const policy = mpcPolicySchema.parse(policyInput); proposalInputSchema.parse(proposal); z.iso.datetime().parse(now);
  validateOperationAmount(proposal.operation, proposal.amountBaseUnits);
  if (proposal.policyId !== policy.policyId) throw new Error("MPC policy mismatch");
  if (proposal.status !== "approved") throw new Error("MPC proposal is not approved");
  if (Date.parse(now) >= Date.parse(proposal.expiresAt)) throw new Error("MPC proposal expired");
  if (!policy.allowedOperations.includes(proposal.operation)) throw new Error("operation not allowed by MPC policy");
  if (BigInt(proposal.amountBaseUnits) > BigInt(policy.maximumPaymentBaseUnits)) throw new Error("proposal exceeds MPC payment limit");
  const approvals = new Set(proposal.approvals);
  if (approvals.size !== proposal.approvals.length) throw new Error("duplicate MPC approvals");
  if ([...approvals].some((participant) => !policy.participants.includes(participant))) throw new Error("unknown MPC participant approval");
  if (approvals.size < policy.threshold) throw new Error("MPC approval threshold not met");
}
