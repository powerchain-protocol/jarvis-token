import { JarvisTokenError } from "../common/errors.ts";
import type { JarvisChain } from "../common/types.ts";

export type ClaimStatus =
  | "pending-attestation"
  | "ready"
  | "submitting"
  | "submitted"
  | "confirmed"
  | "failed";

export interface JarvisClaim {
  id: string;
  transferId: string;
  routeId: string;
  sourceChain: JarvisChain;
  destinationChain: JarvisChain;
  amountBaseUnits: bigint;
  recipient: string;
  attestationDigest?: string;
  attestationExpiresAt?: string;
  destinationTransaction?: string;
  status: ClaimStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimInput {
  id: string;
  transferId: string;
  routeId: string;
  sourceChain: JarvisChain;
  destinationChain: JarvisChain;
  amountBaseUnits: bigint;
  recipient: string;
  now?: string;
}

const transitions: Readonly<Record<ClaimStatus, readonly ClaimStatus[]>> = {
  "pending-attestation": ["ready", "failed"],
  ready: ["submitting", "failed"],
  submitting: ["submitted", "failed"],
  submitted: ["confirmed", "failed"],
  confirmed: [],
  failed: [],
};

export function createJarvisClaim(input: CreateClaimInput): JarvisClaim {
  if (!input.id.trim() || !input.transferId.trim() || !input.routeId.trim()) {
    throw new JarvisTokenError("INVALID_ASSET", "Claim identity is incomplete");
  }
  if (input.sourceChain === input.destinationChain) {
    throw new JarvisTokenError("INVALID_ASSET", "Claim source and destination chains must differ");
  }
  if (input.amountBaseUnits <= 0n) throw new JarvisTokenError("INVALID_AMOUNT", "Claim amount must be positive");
  if (!input.recipient.trim()) throw new JarvisTokenError("INVALID_ASSET", "Claim recipient is required");
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    transferId: input.transferId,
    routeId: input.routeId,
    sourceChain: input.sourceChain,
    destinationChain: input.destinationChain,
    amountBaseUnits: input.amountBaseUnits,
    recipient: input.recipient,
    status: "pending-attestation",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function attachClaimAttestation(claim: JarvisClaim, digest: string, now = new Date().toISOString()): JarvisClaim {
  if (claim.status !== "pending-attestation") throw new JarvisTokenError("STORAGE_CONFLICT", "Claim is not awaiting an attestation");
  if (!/^[a-f0-9]{64}$/i.test(digest)) throw new JarvisTokenError("INVALID_ASSET", "Attestation digest must be a 32-byte hexadecimal digest");
  return { ...claim, attestationDigest: digest.toLowerCase(), status: "ready", updatedAt: now };
}

export function transitionClaim(claim: JarvisClaim, status: ClaimStatus, now = new Date().toISOString()): JarvisClaim {
  if (!transitions[claim.status].includes(status)) {
    throw new JarvisTokenError("STORAGE_CONFLICT", `Cannot transition claim from ${claim.status} to ${status}`);
  }
  return { ...claim, status, attempts: status === "submitting" ? claim.attempts + 1 : claim.attempts, updatedAt: now };
}

export function confirmClaim(claim: JarvisClaim, destinationTransaction: string, now = new Date().toISOString()): JarvisClaim {
  if (claim.status !== "submitted") throw new JarvisTokenError("STORAGE_CONFLICT", "Only a submitted claim can be confirmed");
  if (!destinationTransaction.trim()) throw new JarvisTokenError("INVALID_ASSET", "Destination transaction is required");
  return { ...claim, destinationTransaction, status: "confirmed", updatedAt: now };
}

export function claimReplayKey(claim: Pick<JarvisClaim, "routeId" | "transferId" | "attestationDigest">): string {
  if (!claim.attestationDigest) throw new JarvisTokenError("NOT_VERIFIED", "Claim attestation is not available");
  return `${claim.routeId}:${claim.transferId}:${claim.attestationDigest}`;
}

export function canonicalClaimPayload(claim: Pick<JarvisClaim, "transferId" | "routeId" | "sourceChain" | "destinationChain" | "amountBaseUnits" | "recipient">): string {
  return [
    "jarvis-claim-v1",
    claim.transferId,
    claim.routeId,
    claim.sourceChain,
    claim.destinationChain,
    claim.amountBaseUnits.toString(),
    claim.recipient,
  ].join("|");
}

export function assertClaimAttestationFresh(claim: JarvisClaim, now = Date.now()): void {
  if (!claim.attestationDigest) throw new JarvisTokenError("NOT_VERIFIED", "Claim attestation is not available");
  if (claim.attestationExpiresAt) {
    const expires = Date.parse(claim.attestationExpiresAt);
    if (!Number.isFinite(expires) || expires <= now) throw new JarvisTokenError("NOT_VERIFIED", "Claim attestation has expired");
  }
}
