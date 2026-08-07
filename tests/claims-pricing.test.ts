import test from "node:test";
import assert from "node:assert/strict";
import {
  attachClaimAttestation,
  calculateFiatMinorUnits,
  calculateOneToOneBridgeAmount,
  claimReplayKey,
  createJarvisClaim,
  resolveFreshPrice,
  transitionClaim,
} from "../functions/index.ts";
import { InMemoryClaimRepository, JarvisClaimService } from "../services/claim.ts";

test("claim lifecycle requires attestation before submission", () => {
  let claim = createJarvisClaim({
    id: "claim-1",
    transferId: "transfer-1",
    routeId: "jarvis:sui:solana:wormhole-ntt",
    sourceChain: "sui",
    destinationChain: "solana",
    amountBaseUnits: 1_000_000n,
    recipient: "recipient",
    now: "2026-08-07T00:00:00.000Z",
  });
  assert.equal(claim.status, "pending-attestation");
  claim = attachClaimAttestation(claim, "ab".repeat(32), "2026-08-07T00:00:01.000Z");
  assert.equal(claim.status, "ready");
  assert.match(claimReplayKey(claim), /transfer-1/);
  claim = transitionClaim(claim, "submitting");
  assert.equal(claim.attempts, 1);
});

test("claim repository atomically reserves replay keys", async () => {
  const repo = new InMemoryClaimRepository();
  assert.equal(await repo.reserveReplayKey("key", "claim-a"), true);
  assert.equal(await repo.reserveReplayKey("key", "claim-b"), false);
});

test("claim service fails repeated attestation claims closed", async () => {
  const repo = new InMemoryClaimRepository();
  const base = createJarvisClaim({
    id: "claim-2",
    transferId: "transfer-2",
    routeId: "jarvis:sui:solana:wormhole-ntt",
    sourceChain: "sui",
    destinationChain: "solana",
    amountBaseUnits: 2_000_000n,
    recipient: "recipient",
  });
  await repo.save(base);
  const service = new JarvisClaimService(
    { get: async () => ({
      digest: "cd".repeat(32),
      transferId: "transfer-2",
      routeId: "jarvis:sui:solana:wormhole-ntt",
      sourceChain: "sui",
      destinationChain: "solana",
      amountBaseUnits: 2_000_000n,
      recipient: "recipient",
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }) },
    { submit: async () => ({ transactionId: "tx-1", submittedAt: new Date().toISOString() }) },
    repo,
  );
  const submitted = await service.submit("claim-2");
  assert.equal(submitted.status, "submitted");
  const second = createJarvisClaim({ ...base, id: "claim-3" });
  await repo.save(second);
  await assert.rejects(() => service.submit("claim-3"), /already been reserved or redeemed/);
});

test("JARVIS bridge calculation stays exactly 1:1", () => {
  assert.equal(calculateOneToOneBridgeAmount(12_345_678n), 12_345_678n);
});

test("fiat valuation uses decimal strings and bigint math", () => {
  // 10 JARVIS at $0.125 = $1.25 = 125 cents.
  assert.equal(calculateFiatMinorUnits({ tokenBaseUnits: 10_000_000n, tokenDecimals: 6, rate: "0.125" }), 125n);
});

test("price resolution never fabricates fallback prices", async () => {
  const resolution = await resolveFreshPrice([{ id: "down", get: async () => null }], "jarvis", "USD");
  assert.equal(resolution.quote, null);
  assert.deepEqual(resolution.attemptedProviders, ["down"]);
});

test("claim service rejects an attestation with a changed recipient", async () => {
  const repo = new InMemoryClaimRepository();
  const claim = createJarvisClaim({
    id: "claim-bound",
    transferId: "transfer-bound",
    routeId: "jarvis:sui:solana:wormhole-ntt",
    sourceChain: "sui",
    destinationChain: "solana",
    amountBaseUnits: 1_000_000n,
    recipient: "expected-recipient",
  });
  await repo.save(claim);
  const service = new JarvisClaimService(
    { get: async () => ({
      digest: "ef".repeat(32),
      transferId: "transfer-bound",
      routeId: claim.routeId,
      sourceChain: "sui",
      destinationChain: "solana",
      amountBaseUnits: 1_000_000n,
      recipient: "attacker-recipient",
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }) },
    { submit: async () => ({ transactionId: "never", submittedAt: new Date().toISOString() }) },
    repo,
  );
  await assert.rejects(() => service.submit("claim-bound"), /exact claim route, amount, and recipient/);
});

test("price consensus rejects excessive provider deviation", async () => {
  const now = Date.now();
  const mk = (id: string, rate: string) => ({
    id,
    get: async () => ({
      baseAssetId: "jarvis", quoteCurrency: "USD", rate, source: id,
      observedAt: new Date(now - 1000).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
    }),
  });
  const resolution = await resolveFreshPrice([mk("a","1.00"), mk("b","2.00")], "jarvis", "USD", now, {
    minimumSources: 2,
    maximumDeviationBps: 500,
  });
  assert.equal(resolution.quote, null);
  assert.equal(resolution.confidence, "unavailable");
});

test("price consensus returns a median fresh quote", async () => {
  const now = Date.now();
  const mk = (id: string, rate: string) => ({
    id,
    get: async () => ({
      baseAssetId: "jarvis", quoteCurrency: "USD", rate, source: id,
      observedAt: new Date(now - 1000).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
    }),
  });
  const resolution = await resolveFreshPrice([mk("a","1.00"), mk("b","1.01"), mk("c","1.02")], "jarvis", "USD", now, {
    minimumSources: 2,
    maximumDeviationBps: 250,
  });
  assert.equal(resolution.quote?.rate, "1.01");
  assert.equal(resolution.confidence, "consensus");
});
