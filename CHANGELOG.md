# Changelog

## 1.0.0-rc.0

- Added PostgreSQL persistence through Prisma with an initial constrained
  migration, Neon/Supabase connection-role validation, optimistic bridge-state
  repositories, append-only claim/audit evidence, and verified snapshot storage.
- Added network-bound Sui and Solana explorer helpers for transactions,
  accounts, and Sui objects.
- Added validated optimistic-lock repositories for guarded transaction intents
  and AI ledgers; corrupted lifecycle, digest, and balance state fails closed.
- Added a persistence-hardening migration for JSON object shape, digest format,
  chain/network consistency, and database-managed update timestamps.
- Fixed explorer type confusion by validating Sui transactions separately from
  accounts/objects and requiring realistic Solana signature lengths.
- Made audit payload commitments canonical and order-independent; invalid JSON,
  non-finite numbers, malformed event names, and invalid timestamps fail closed.
- Added shared canonical-JSON, chain/network, identifier, and ISO-time utilities;
  transaction, audit, and explorer code now consume the same validators.
- Added deny-by-default database access controls: RLS on all JARVIS tables,
  revoked `PUBLIC` privileges, and conditional Supabase API-role revocation.
- Removed locale-dependent key sorting from canonical JSON commitments so hash
  ordering is stable across operating-system locale configurations.
- Added a credential-safe, read-only database readiness report for committed
  migrations, expected table presence, and complete RLS coverage.
- Added exact decimal/base-unit parsing, formatting, bounded addition, and safe
  subtraction helpers for JARVIS token amounts.
- Finalized allocation claims now require chain-valid transaction identifiers
  and cannot predate approval; tokenomics hashing uses shared locale-stable
  canonical JSON throughout.
- Added SUI/MIST and SOL/lamport network-fee quotes, intent-digest binding,
  expiry checks, maximum-fee authorization, and finalized fee reconciliation.
- Guarded transaction submission now validates chain-specific transaction IDs;
  native network fees remain separate from JARVIS payments and refund totals.
- Added chain/network-bound finalized block anchors for terminal transactions
  and allocation claims, with Sui checkpoint/Solana slot data validation.
- Added indexed finality block columns and migration/readiness integration while
  keeping legacy database rows nullable and new terminal evidence strict.
- Added canonical SHA-256 block-anchor commitments and database constraints that
  enforce complete finality data by transaction status for all new writes.

- Promoted the coordinated TypeScript, Sui Move, client, CLI, metadata, CI,
  documentation, and deterministic release identifiers to `1.0.0-rc.0`.
- Renamed the canonical release archive to
  `jarvis-token-1.0.0-rc.0.tar.gz` and retained all production safety gates.
- This release candidate remains non-deployed and mainnet-blocked until the
  documented dependency, audit, testnet, custody, and evidence gates pass.
- Expanded tokenomics into a publication-ready monetary policy covering supply
  lifecycle and invariants, treasury and future allocation controls, AI-credit
  separation, fees and governance limits, transparency, conformance, risks,
  and intentionally undecided economic fields.
- Added machine-readable tokenomics policy and an approved-allocation validator
  enforcing exact supply, 100% basis-point totals, vesting, custody identities,
  unique reviews, and approval evidence through the CLI.
- Added deterministic, order-independent allocation commitments with category
  reconciliation and made the commitment hash mandatory in release evidence.
- Added deterministic vesting snapshots for immediate, linear, cliff, and
  milestone schedules with claimed/claimable/unvested reconciliation.
- Added milestone integrity checks and a non-overwriting `project-vesting` CLI
  command for public circulating-supply and treasury reports.
- Upgraded vesting reports to transaction-linked claim events with event-time
  vesting enforcement, claim/transaction replay protection, category totals,
  claim-ledger commitments, and tamper-evident snapshot hashes.
- Normalized milestone ordering so equivalent schedules produce the same
  allocation commitment.
- Added strict, independent vesting-snapshot verification that recomputes every
  field from the approved plan and complete claim ledger; production checks
  reject legacy aggregate evidence by default.
- Bound production claim evidence to successful finalized chain receipts,
  chain-specific networks and JARVIS assets, validated addresses, custody
  source, recipient, and observation chronology; older event formats remain
  migration-only.
- Added commitment-bound allocation custody metadata and require finalized
  claims to match the approved chain, network, JARVIS asset, and custody address
  exactly; generic legacy custody records cannot produce production evidence.
- Fixed historical snapshot cutoffs: claims now enter supply totals only when
  finalized evidence was observed by `asOf`, and later receipts no longer
  mutate earlier claim-ledger or snapshot commitments.

## Documentation revision

- Added a documentation index, architecture and responsibility boundaries,
  complete fixed-supply tokenomics, deployment guide, bridge operator runbook,
  and independent verification/release-evidence guide.
- Corrected the canonical documentation path while retaining misspelled legacy
  filenames as compatibility pointers.

## AI utility layer

- Added exact multimodal LLM usage pricing in JARVIS base units.
- Added idempotent reserves, settlement, cancellation, and balance protection.
- Added tokenized chat/agent budgets with digest-only turn receipts.
- Added MPC policy/proposal approval logic without key custody or signing.
- Added a non-settling `quote-ai-usage` CLI and public TypeScript exports.
- Added guarded payment/refund intents with canonical hashing, replay and expiry
  protection, MPC binding, lifecycle transitions, and finalized receipt checks.
- Fixed chain/network/asset validation, expired-MPC authorization, failed-receipt
  transaction binding, and cross-asset refund rejection.
- Revalidate MPC policy/participants/threshold at transaction authorization;
  added safe idempotent AI settlement/cancellation and stronger reserve binding.
- Added fail-closed validation of persisted AI ledgers, chat receipts, budgets,
  and pending MPC approval state before every mutation.
- Bounded AI rates, quotes, balances, budgets, and MPC payments by the fixed
  global supply; reject unsafe counters, non-canonical amounts, and invalid
  zero-value MPC payment or non-zero bridge-pause proposals.

## Security hardening

- Added CI, fail-closed production dependency auditing, a security policy,
  bridge threat model, incident response, and explicit tracking of the
  unresolved Solana SDK advisory.
- Added a pure bridge-transfer state machine with pause and limit enforcement,
  transfer-ID replay protection, digest binding, unique M-of-N attestations,
  redemption gating, manual-review quarantine, and in-flight aggregation.
- Fixed attestation authorization: only configured transceivers count, threshold
  feasibility is validated, and message digests are replay-protected across IDs.
- Fixed rate-limit semantics to include used window capacity; added chronological
  event checks, attestation-ID replay protection, and duplicate aggregation guards.
- Added fail-closed validation of every persisted bridge transfer before
  attestation, completion, quarantine, or in-flight aggregation; corrupted
  thresholds, actions, transceivers, attestations, amounts, timestamps, and
  terminal evidence are rejected.

## 1.0.0-beta.0 production-candidate refresh

- Corrected Solana verification and evidence for the Sui-canonical wrapped model.
- Added NTT-authorized mint semantics without unrestricted or unbacked minting.
- Added fail-closed production readiness, NTT planning, and bridge reconciliation scripts.
- Added installation, introduction, and deployment instructions under `docs/`.
- Documented mainnet audit, multisig, monitoring, simulation, and approval gates.
- Corrected reverse in-flight bridge accounting and added regression coverage.
- Removed raw mint-authority transfer generation; upstream checked NTT set/claim is mandatory.
- Added fail-closed cross-file validation for network, mint, NTT authority, Sui object IDs, placeholders, and zero mainnet limits.
- Replaced the stale deployment template with a cross-chain evidence bundle and added identity, supply, hash, and two-reviewer validation.
- Added deterministic packaging, source manifests, release checksums, path-safety verification, and a byte-for-byte reproducibility check.

## 1.0.0-beta.0 hardening revision

- Require an explicit mainnet review acknowledgement.
- Require distinct Solana public keys for treasury, fee payer, mint, mint
  authority, and metadata authority.
- Redact RPC credentials, paths, queries, and fragments from generated plans.
- Verify the Solana treasury ATA owner, mint, and complete genesis allocation.
- Verify canonical metadata URI and version in addition to name and symbol.
- Require the Sui publisher address to exactly equal the configured treasury.
- Expand negative and serialized-transaction test coverage from four to seven
  tests.
- Add operational `/scripts`, deployment `/target` profiles, and evidence plus
  target-integrity tests.
- Require evidence to be independently verified and bind metadata/coin identity
  to the recorded mint or package.
- Add canonical `contracts/jarvis/sources` and mirrored
  `testnet-contract/jarvis/sources` layouts with framework-specific manifests,
  synchronization tooling, and byte-for-byte drift tests.
- Add mainnet/testnet Token-2022 program profiles and a supported
  `clients/typescript/src/jarvis` facade without signing or broadcast methods.
- Add normalized public image assets, hash-bound root metadata, PNG integrity
  tests, and a standalone `walrus::metadata` Move package.
