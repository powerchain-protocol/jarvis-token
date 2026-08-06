# JARVIS cross-chain token

Production-candidate source and guarded deployment tooling for canonical
fixed-supply JARVIS on Sui and bridge-backed Token-2022 JARVIS on Solana.

This repository does **not** claim a deployment. It does not contain a
broadcast path, private key loader, seed phrase handler, or mainnet signing
automation.

“Mintable JARVIS” means the Solana wrapped mint is controlled by the verified
Wormhole NTT token authority. It can mint only as part of lock/mint bridging
against Sui collateral. Canonical Sui supply is not mintable after publication.

Start with the [documentation index](docs/README.md),
[Introduction](docs/introduction.md), [Installation](docs/installation.md), and
[Deployment instructions](docs/deployment.md). Security operators must
also review [Security policy](SECURITY.md), [Threat model](docs/threat-model.md),
and [Incident response](docs/incident-response.md).
The AI settlement model is documented in [JARVIS AI utility](docs/ai-utility.md).
Payment lifecycle controls are documented in [Guarded transactions](docs/transactions.md).
Persistence, Prisma migrations, Neon, and Supabase configuration are documented
in [Database integration](docs/database.md).
The frozen monetary policy is documented in [Tokenomics](TOKENOMICS.md),
and live bridge procedures are documented in
[Bridge operations](docs/bridge-operations.md).

## Repository layout

- `programs/{mainnet,testnet}/jarvis/` contains public Token-2022 program
  profiles. There is intentionally no custom Solana JARVIS program.
- `clients/typescript/src/jarvis/` contains the supported non-signing client.
- `packages/token-core/src/utils/` contains shared canonical JSON, chain,
  identifier, and timestamp helpers used by security-sensitive modules.
- `prisma/` contains the PostgreSQL schema and immutable migration history for
  Neon, Supabase, or standard PostgreSQL deployments.
- `contracts/jarvis/` contains the canonical mainnet Sui package.
- `testnet-contract/jarvis/` contains the testnet Sui package mirror.
- `scripts/`, `tests/`, and `target/` contain operations, verification, and
  public deployment profiles.
- `public/assets/` contains the canonical and theme-specific token images;
  `metadata/metadata.json` binds each image to its SHA-256 digest.
- `contracts/walrus/` contains the standalone `walrus::metadata` Move utility.

## Frozen tokenomics

| Property | Value |
|---|---:|
| Name | Jarvis AI |
| Symbol | JARVIS |
| Decimals | 6 |
| Whole-token supply | 18,440,000,000 |
| Base-unit supply | 18,440,000,000,000,000 |
| Origin | Sui treasury only |
| Solana genesis supply | 0 wrapped JARVIS |

## AI utility

The TypeScript package provides deterministic multimodal usage quotes,
idempotent reservations, settlement/refund logic, tokenized chat and agent
budgets, digest-only turn receipts, and MPC approval-policy state. It does not
call LLM providers, store prompts, manage key shares, sign, or broadcast. AI
usage accounting never changes the fixed JARVIS supply.

Public token helpers parse and format up to six decimal places using exact
integer arithmetic, with fixed-supply overflow and subtraction-underflow
protection. Exponent notation and non-canonical decimal forms are rejected.

Transaction functions create canonical hash-bound payment/refund intents,
require exact MPC proposal binding, enforce replay/expiry/address/amount rules,
and reconcile finalized receipts. They intentionally expose no signing or
broadcasting function.

## Design

### Cross-chain model

The Sui coin is the only origin of supply. Wormhole Native Token Transfers
(NTT) runs in locking mode on Sui and burning mode on Solana. A Sui→Solana
transfer locks canonical coins and mints an equal wrapped amount. The reverse
burns wrapped coins before releasing canonical coins. See
`bridge/wormhole/README.md` for lifecycle, invariants, risks, and operations.

The TypeScript client includes a non-signing transfer state machine with pause,
rate-limit, replay, digest, unique-attestation threshold, completion, quarantine,
and in-flight aggregation logic. Actual attestations and redemptions remain the
responsibility of the pinned upstream NTT integration.

Only explicitly configured transceiver identities count toward the threshold;
the configuration rejects duplicates and thresholds larger than the unique
allowlist. Both transfer IDs and bridge message digests are replay-protected.
Rate limits account for capacity already consumed in the active window, rather
than merely limiting each transfer. Attestation and completion timestamps must
be chronological, and attestation identifiers are replay-protected.

### Solana wrapped asset

- Token-2022 is mandatory.
- Canonical metadata is stored directly on the mint through the Token Metadata
  extension; the Metadata Pointer points back to the mint.
- Freeze authority is never configured.
- Genesis supply is zero; the plan contains no mint-to instruction.
- Mint authority is handed to the verified NTT token-authority address and is
  not revoked, because bridge-controlled mint/burn is required.
- Metadata-pointer and metadata-update authorities are revoked after setup.
- Plans contain unsigned transaction-message bytes and required public signers.
  They expire with their recent blockhash and must be regenerated before use.
- Generated plans retain only the public RPC origin; credentials, paths, query
  parameters, and fragments are removed.
- Mainnet configuration requires distinct treasury, fee-payer, mint,
  mint-authority, and metadata-authority public keys plus a recorded review
  acknowledgement.

### Sui

- `init` runs only on package publication.
- The complete supply is minted to the publishing address.
- `coin::treasury_into_supply` consumes and deletes the `TreasuryCap` object.
- The resulting `Supply` is enclosed in a `FixedSupply` object and frozen.
- Metadata is frozen. There is no mint or burn entry point in the package.

Sui package layouts:

- `contracts/jarvis/` is the canonical mainnet package.
- `testnet-contract/jarvis/` pins the testnet framework profile.
- `packages/jarvis-sui/` is retained as a compatibility layout.
- `scripts/sync-contracts.sh` copies the canonical Move source to both mirrors;
  tests fail if any source drifts.

The Sui plan builder rejects configurations where the publish sender does not
exactly equal the approved treasury address. Confirm the active CLI address
again before any signing ceremony.

## Commands

```bash
npm install
npm run check
npm test

# Validate the schema, then apply committed migrations through DIRECT_URL.
npm run db:validate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:readiness

# Generates artifacts only; refuses to overwrite an existing output file.
npm run jarvis -- plan-solana-wrapped --config config/mainnet.json --out artifacts/solana-plan.json
npm run jarvis -- plan-ntt --config bridge/wormhole/ntt.testnet.json --out artifacts/ntt-plan.json
npm run jarvis -- verify-bridge-snapshot --file snapshot.json --out artifacts/bridge-report.json
npm run jarvis -- plan-sui --config config/sui-mainnet.json --out artifacts/sui-plan.json

# Read-only independent inspection.
npm run jarvis -- verify-solana --rpc-url <RPC_URL> --mint <MINT> --bridge-authority <NTT_AUTHORITY> --metadata-uri <URI> --out artifacts/verify.json
npm run jarvis -- validate-evidence --file evidence.json
npm run jarvis -- validate-release-evidence --file release-evidence.json
npm run jarvis -- quote-ai-usage --usage config/ai-usage.example.json --schedule config/ai-price-schedule.example.json --quoted-at 2026-08-06T12:00:00.000Z --out artifacts/ai-quote.json
npm run jarvis -- validate-allocation --file allocation-plan.json
npm run jarvis -- commit-allocation --file allocation-plan.json --out artifacts/allocation-commitment.json
npm run jarvis -- project-vesting --file allocation-plan.json --as-of 2027-01-01T00:00:00.000Z --claims claims.json --out artifacts/vesting-snapshot.json
npm run jarvis -- verify-vesting-snapshot --snapshot artifacts/vesting-snapshot.json --file allocation-plan.json --claims claims.json
npm run jarvis -- validate-database-config --production

# Fails closed when mandatory production dependencies such as Sui CLI are absent.
bash scripts/production-readiness.sh config/mainnet.json config/ntt-mainnet.json
bash scripts/reproducibility-check.sh
bash scripts/verify-release.sh target/releases/jarvis-token-1.0.0-rc.0.tar.gz target/releases/SHA256SUMS
```

## Required production review

Before signing or submission:

1. Replace every placeholder and independently verify each public address.
2. Host the canonical metadata JSON at a durable URI and update its image URI.
3. Build and test the Sui package against the exact mainnet framework revision.
4. Simulate every transaction against the target network.
5. Verify Sui fixed supply, zero Solana genesis supply, and NTT authority handoff.
6. Exercise lock/mint and burn/release on testnet and reconcile all supply states.
7. Publish transaction signatures/digests and explorer links.
8. Have a separate operator run the verifier and sign the evidence record.

Never commit private keys, keypair JSON, mnemonics, or signing-service tokens.

## Production status

The code is structured as a production candidate, not a declaration of
production readiness. Mainnet remains blocked until the pinned Sui and NTT
releases compile and pass tests, project-specific security review is complete,
testnet acceptance succeeds, multisig and monitoring are operational, and
independent deployment evidence is published.

The current audit reports a high-severity advisory in the legacy Solana SDK
dependency tree with no npm fix. The fail-closed security gate blocks mainnet
readiness until migration/upstream remediation or an approved, time-limited
risk acceptance. See `SECURITY.md`.

Production validation rejects placeholder identities and ensures that the
Solana deployment and NTT configuration name the exact same mint and bridge
token authority before any plan is accepted.

AI usage counters reject JavaScript-unsafe integers. All AI rates, quotes,
balances, reservations, chat budgets, settlements, and MPC payments use
canonical integer strings and cannot exceed the fixed global JARVIS supply.

The final evidence bundle must reconcile Sui locked/circulating supply with
Solana wrapped/in-flight supply, cross-check bridge identities, record at least
three artifact hashes, and contain approvals from two distinct reviewers.

Release packaging is deterministic with `SOURCE_DATE_EPOCH`, normalized file
ownership/timestamps, stable ordering, and gzip timestamps disabled. Packaging
also emits `SOURCE-MANIFEST.sha256` and `SHA256SUMS`; verify both source inputs
and the final archive before recording hashes in release evidence.
