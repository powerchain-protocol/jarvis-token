import { JarvisTokenError } from "../common/errors.ts";
import {
  attachClaimAttestation,
  claimReplayKey,
  confirmClaim,
  transitionClaim,
  type JarvisClaim,
} from "../functions/claim.ts";

export interface ClaimAttestation {
  digest: string;
  transferId: string;
  routeId: string;
  sourceChain: "sui" | "solana";
  destinationChain: "sui" | "solana";
  amountBaseUnits: bigint;
  recipient: string;
  observedAt: string;
  expiresAt: string;
}

export interface ClaimSubmission {
  transactionId: string;
  submittedAt: string;
}

export interface ClaimAttestationProvider {
  get(transferId: string): Promise<ClaimAttestation | null>;
}

export interface ClaimExecutor {
  submit(claim: JarvisClaim): Promise<ClaimSubmission>;
}

export interface ClaimRepository {
  get(id: string): Promise<JarvisClaim | null>;
  save(claim: JarvisClaim): Promise<void>;
  hasReplayKey(key: string): Promise<boolean>;
  reserveReplayKey(key: string, claimId: string): Promise<boolean>;
}

export class InMemoryClaimRepository implements ClaimRepository {
  private readonly claims = new Map<string, JarvisClaim>();
  private readonly replayKeys = new Map<string, string>();

  async get(id: string): Promise<JarvisClaim | null> {
    const value = this.claims.get(id);
    return value ? structuredClone(value) : null;
  }

  async save(claim: JarvisClaim): Promise<void> {
    this.claims.set(claim.id, structuredClone(claim));
  }

  async hasReplayKey(key: string): Promise<boolean> {
    return this.replayKeys.has(key);
  }

  async reserveReplayKey(key: string, claimId: string): Promise<boolean> {
    if (this.replayKeys.has(key)) return false;
    this.replayKeys.set(key, claimId);
    return true;
  }
}

export class JarvisClaimService {
  private readonly attestations: ClaimAttestationProvider;
  private readonly executor: ClaimExecutor;
  private readonly repository: ClaimRepository;

  constructor(attestations: ClaimAttestationProvider, executor: ClaimExecutor, repository: ClaimRepository) {
    this.attestations = attestations;
    this.executor = executor;
    this.repository = repository;
  }

  async refresh(claimId: string): Promise<JarvisClaim> {
    const claim = await this.requireClaim(claimId);
    if (claim.status !== "pending-attestation") return claim;
    const attestation = await this.attestations.get(claim.transferId);
    if (!attestation) return claim;
    if (
      attestation.transferId !== claim.transferId ||
      attestation.routeId !== claim.routeId ||
      attestation.sourceChain !== claim.sourceChain ||
      attestation.destinationChain !== claim.destinationChain ||
      attestation.amountBaseUnits !== claim.amountBaseUnits ||
      attestation.recipient !== claim.recipient
    ) {
      throw new JarvisTokenError("NOT_VERIFIED", "Attestation does not bind the exact claim route, amount, and recipient");
    }
    const expires = Date.parse(attestation.expiresAt);
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      throw new JarvisTokenError("NOT_VERIFIED", "Claim attestation has expired");
    }
    const ready = { ...attachClaimAttestation(claim, attestation.digest), attestationExpiresAt: attestation.expiresAt };
    await this.repository.save(ready);
    return ready;
  }

  async submit(claimId: string): Promise<JarvisClaim> {
    let claim = await this.refresh(claimId);
    if (claim.status !== "ready") throw new JarvisTokenError("NOT_VERIFIED", "Claim is not ready");
    const replayKey = claimReplayKey(claim);
    if (claim.attempts >= 3) throw new JarvisTokenError("STORAGE_CONFLICT", "Claim submission attempt limit reached");
    if (!(await this.repository.reserveReplayKey(replayKey, claim.id))) {
      throw new JarvisTokenError("STORAGE_CONFLICT", "Claim attestation has already been reserved or redeemed");
    }

    claim = transitionClaim(claim, "submitting");
    await this.repository.save(claim);
    try {
      const submission = await this.executor.submit(claim);
      claim = { ...transitionClaim(claim, "submitted", submission.submittedAt), destinationTransaction: submission.transactionId };
      await this.repository.save(claim);
      return claim;
    } catch (cause) {
      const failed = transitionClaim(claim, "failed");
      await this.repository.save(failed);
      throw cause;
    }
  }

  async confirm(claimId: string, destinationTransaction?: string): Promise<JarvisClaim> {
    const claim = await this.requireClaim(claimId);
    const transaction = destinationTransaction ?? claim.destinationTransaction;
    if (!transaction) throw new JarvisTokenError("NOT_VERIFIED", "Destination transaction is required for claim confirmation");
    const confirmed = confirmClaim(claim, transaction);
    await this.repository.save(confirmed);
    return confirmed;
  }

  private async requireClaim(id: string): Promise<JarvisClaim> {
    const claim = await this.repository.get(id);
    if (!claim) throw new JarvisTokenError("NOT_CONFIGURED", "Claim was not found", { id });
    return claim;
  }
}
