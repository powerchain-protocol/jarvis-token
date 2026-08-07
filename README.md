# JARVIS Token

Canonical token source and guarded deployment specifications for **JARVIS on Sui** and its official **bridged Token-2022 representation on Solana**.

This directory is the source of truth for token identity, monetary policy, canonical Sui issuance code, Solana representation profiles, metadata, and artwork. Cross-chain bridge execution remains a platform capability under the root `contracts/`, `programs/`, `packages/domains/bridge/`, and infrastructure adapters.

> This repository does not itself prove a Mainnet deployment. Public package IDs, object IDs, mints, NTT managers, and bridge identities must be independently verified before activation.

## Canonical model

```text
JARVIS
├── Sui
│   ├── type: canonical
│   ├── decimals: 6
│   └── fixed supply: 18,440,000,000
└── Solana
    ├── type: bridged
    ├── provider: Wormhole NTT
    ├── standard: Token-2022
    └── genesis supply: 0
```

The effective cross-chain invariant is exact 1:1 backing. Dynamic SUI/SOL network and priority fees are separate transaction costs and never reduce the JARVIS amount being represented.

## Directory layout

```text
token/
├── README.md
├── TOKENOMICS.md
├── STRUCTURE.md
├── assets/                         # canonical artwork + generated runtime sizes
├── common/                         # provider-neutral token types
├── constants/                      # immutable identity/supply/routes
├── context/                        # deployment/environment context
├── data/                           # derived registry/index data
├── database/schemas/               # portable persistence contracts
├── functions/                      # pure token business functions
├── security/                       # authority/activation/secret policy
├── storage/                        # provider-neutral storage contracts
├── ui/                             # labels, badges, token CSS
├── utils/                          # precision, identities, hashing
├── validation/                     # canonical model validation
├── config/
│   ├── asset.json                  # canonical asset/representation registry
│   ├── tokenomics.policy.json      # frozen monetary policy
│   ├── allocation-policy.json      # allocation enforcement policy
│   └── treasury-policy.example.json # governance template; not production approval
├── contracts/
│   ├── sui-mainnet/                # canonical Sui Move package
│   └── sui-testnet/                # Testnet package mirror
├── docs/
│   ├── tokenomics.md
│   └── tokenomics-enforcement.md
├── metadata/
│   ├── metadata.json
│   ├── sui.json
│   ├── solana.json
│   ├── security.json
│   ├── logo-manifest.json
│   ├── asset-manifest.json
│   └── integrity-manifest.json
├── scripts/                        # token-local build/validation tooling
└── programs/
    └── solana/
        ├── mainnet-token-2022.json
        └── testnet-token-2022.json
```

See [`STRUCTURE.md`](STRUCTURE.md) for ownership boundaries.

## Frozen tokenomics

| Property | Value |
| --- | ---: |
| Name | JARVIS |
| Symbol | JARVIS |
| Decimals | 6 |
| Whole-token supply | 18,440,000,000 |
| Base-unit supply | 18,440,000,000,000,000 |
| Canonical chain | Sui |
| Solana genesis supply | 0 |
| Solana representation | Bridged · Wormhole NTT · Token-2022 |

Full policy: [`TOKENOMICS.md`](TOKENOMICS.md) and [`config/tokenomics.policy.json`](config/tokenomics.policy.json).

## Sui canonical issuance

The canonical package lives in [`contracts/sui-mainnet/`](contracts/sui-mainnet/). The Testnet mirror lives in [`contracts/sui-testnet/`](contracts/sui-testnet/).

The token package is designed so that:

- the fixed supply is created at publication;
- the `TreasuryCap` is consumed into frozen supply accounting;
- metadata is frozen;
- no public mint path remains after canonical initialization;
- bridge operations do not create new canonical supply.

`scripts/sync-contracts.sh` synchronizes the canonical Move source into compatibility/test layouts and validators detect drift.

## Solana representation

The public Token-2022 representation profiles live under [`programs/solana/`](programs/solana/).

The official Solana representation:

- uses Token-2022;
- starts at zero supply;
- has no independent issuance schedule;
- is minted only through the verified bridge authority against canonical Sui backing;
- is burned before canonical Sui assets are released on the return route;
- is displayed to users as **JARVIS · Bridged**, not as a separate asset identity.

Executable bridge policy remains at [`../programs/solana-jarvis-bridge/`](../programs/solana-jarvis-bridge/) because it belongs to the Bridge domain rather than canonical token issuance.

## Metadata and artwork

Canonical metadata is stored at [`metadata/metadata.json`](metadata/metadata.json). Source artwork lives in [`assets/`](assets/).

Application-facing runtime copies live in `../public/assets/` and are generated/synchronized from this directory:

```bash
pnpm token:assets:sync
pnpm token:schemas:validate
pnpm token:integrity:verify
```

Do not edit runtime copies as the source of truth.

## Bridge integration

The supported canonical routes are:

```text
jarvis:sui:solana:wormhole-ntt
jarvis:solana:sui:wormhole-ntt
```

Sui → Solana locks canonical JARVIS and creates the official bridged representation. Solana → Sui burns the bridged representation before canonical assets are released.

Operational and recovery documentation remains platform-level:

- [Bridge configuration](../docs/bridge-configuration.md)
- [Bridge operations](../docs/bridge-operations.md)
- [Sui → Solana transfer](../docs/transfer-sui-to-solana.md)
- [Bridge programs](../docs/bridge-programs.md)

## Sui Testnet development

```bash
pnpm setup:sui
pnpm doctor:sui
pnpm build:sui
ppnpm test:sui
```

After `sui client` generates an address, fund only the **public Testnet address** through `https://faucet.sui.io`. Never place a recovery phrase, private key, or `sui.keystore` contents in Git, `.env`, CI, logs, or documentation.

## Token validation

```bash
pnpm validate:token-layout
pnpm validate:asset-platform
pnpm validate:bridge-routing
ppnpm test:core
```

The layout validator prevents token-specific files from drifting back to the repository root or deprecated paths.

## Related documentation

- [Platform root README](../README.md)
- [Tokenomics](TOKENOMICS.md)
- [Tokenomics implementation notes](docs/tokenomics.md)
- [Platform architecture](../docs/PLATFORM_ARCHITECTURE.md)
- [Asset-first architecture](../docs/engineering/asset-first-platform.md)
- [Canonical assets and fees](../docs/engineering/canonical-assets-and-fees.md)
- [Security policy](../SECURITY.md)

## Token subsystem APIs

The token source tree includes dependency-light TypeScript modules for canonical asset construction, exact decimal conversion, representation lookup, reserve invariants, deployment security, context resolution, storage contracts, and UI labels. They intentionally do not import Sui, Solana, Wormhole, wallet, or RPC SDKs.

```bash
pnpm token:validate
pnpm token:typecheck
pnpm token:security:audit
pnpm token:logos:build
pnpm token:metadata:generate
pnpm token:assets:sync
```

User-facing products retain the ticker **JARVIS** on every network and show **Canonical** or **Bridged** status. Legacy wrapped-token naming is not a public asset identity.

## Token subsystem architecture

The token directory is intentionally dependency-light and can be validated without connecting to Sui, Solana, Wormhole, Helius, or Triton.

```text
Token identity
    ↓
Constants + metadata
    ↓
Pure business functions
    ↓
Validation + security policy
    ↓
Deployment context + health
    ↓
Storage/audit snapshots
    ↓
Platform adapters and UI
```

### Security and readiness

`createJarvisTokenContext()` does not treat a feature flag as proof that JARVIS is deployable. Bridge activation additionally requires the canonical Sui coin type, official Solana mint, Wormhole provider identity, and explicit deployment verification evidence.

The Solana representation security policy requires the configured bridge authority to own minting, disables freeze authority, and requires zero genesis supply for the bridged representation.

### Storage and audit data

`storage/` defines provider-neutral storage contracts for canonical asset state and immutable snapshots. Portable schemas under `database/schemas/` cover representations, deployment evidence, supply reconciliation, reserve reconciliation, token health, authority snapshots, and domain events. Token amounts are represented as integer base-unit strings at persistence boundaries.

### UI/UX policy

The UI always presents one asset identity—**JARVIS**—with a representation badge:

- **Canonical** on Sui uses the green JARVIS token artwork.
- **Bridged** on Solana retains the JARVIS ticker and uses an explicit Bridged badge.
- The platform must not invent `wJARVIS` as a user-facing ticker.
- Token icons must include useful alt text and support reduced-motion/high-contrast interfaces.
- Responsive PNG and lossless WebP derivatives are generated at 16/32/64/128/180/192/256/512px and verified by SHA-256.

Reusable presentation helpers live in `ui/token-presentation.ts`; token-specific CSS lives in `ui/tokens.css`.

### Token-only quality gate

```bash
pnpm token:metadata:generate
pnpm token:registry:generate
pnpm token:assets:verify
pnpm token:schemas:validate
pnpm token:integrity:verify
pnpm token:validate
pnpm token:typecheck
pnpm token:test
pnpm token:security:audit
```

Run all of these with:

```bash
pnpm token:check
```

A deterministic source bundle can be generated with:

```bash
pnpm token:package
```


## Runtime safety model

`JARVIS_BRIDGE_ENABLED=true` is only a request to activate transfers. Runtime activation also requires deployment readiness, verified Wormhole routing, reserve monitoring, and an emergency-pause configuration. `createJarvisTokenContext()` exposes both `requestedBridgeEnabled` and the effective `bridgeEnabled` value so UI and operators cannot confuse intent with readiness.

Token storage uses optimistic versions for canonical asset writes. Production adapters should map this contract to a database transaction or compare-and-swap update; stale writers must fail with `STORAGE_CONFLICT`.

All public interfaces continue to display the ticker `JARVIS`. Chain-specific implementation details belong in representation badges and developer metadata, never renamed user-facing assets.


## On-chain verification and reserve monitoring

Before enabling transfers, infrastructure adapters should fetch the canonical Sui coin observation and official Solana Token-2022 mint observation and pass them to `verifyOnChainJarvis()`. The domain verifier checks identity, six-decimal precision, supply ceilings, and the absence of a Solana freeze authority.

`evaluateBridgeReserve()` provides the chain-independent reserve invariant used by monitoring and operator UI. A positive delta means bridged supply exceeds expected canonical backing and must be treated as critical. Pending bridge lifecycle amounts can be included explicitly so normal in-flight transfers do not create false alerts.

Signed deployment manifests are represented independently from signing infrastructure. Private signing keys must remain in KMS/HSM or an equivalent operator-controlled signing system; they do not belong in `/token`, environment files, or CI logs.

## Live observation and safety gate

`@jarvis-ai/token` is now a workspace package. Chain-specific RPC code remains outside the token domain; the token package defines `TokenObservationProvider`, `TokenMonitoringService`, reserve reconciliation, and the fail-closed transfer gate.

The Bridge runtime adapter reads Sui Coin metadata/supply and bridge custody state plus the Solana Token-2022 mint supply/authority state through configured RPC providers. Observations are cached briefly to avoid amplifying RPC traffic. When live monitoring is enabled, new quotes are rejected if observations are stale, unavailable, identity-invalid, freeze authority is enabled, or bridged supply is not fully backed.

```dotenv
JARVIS_TOKEN_LIVE_MONITORING_ENABLED=false
JARVIS_TOKEN_MONITORING_FAIL_CLOSED=true
JARVIS_TOKEN_MONITORING_MAX_AGE_MS=60000
```

The public/operator health surface is `GET /api/v1/token/health` in `apps/bridge`. It never exposes credentials or signing material.


## Claim and price safety

Claims are destination-chain redemption operations, not a second transfer. A claim requires a verified cross-chain attestation, exact transfer identity, exact recipient and amount, and replay protection. Sui uses the redeemed-message table for release replay protection; Solana uses a message-hash receipt PDA for inbound redemption. Client and service layers must check claimability before requesting a wallet signature.

Market prices and FX-style rates are informational and never change the exact 1:1 JARVIS bridge amount. Network gas and Solana priority fees are calculated separately. If no fresh configured market-data provider is available, JARVIS returns price unavailable rather than inventing a fallback market price.


## Tokenomics and treasury enforcement

The token package now enforces allocation, vesting, treasury, and circulating-supply accounting in integer base units. This release candidate still does not assert a final JARVIS allocation. Future approved allocations must reconcile exactly to 10,000 basis points and the fixed 18,440,000,000,000,000 base-unit supply, with explicit rounding adjustments, governance evidence, custody identities, and independent reviewers. Treasury movements redistribute existing JARVIS only and cannot alter the fixed supply.


## Allocation claims and treasury execution

Tokenomics distribution is separate from bridge redemption.

```text
Approved allocation
      ↓
Beneficiary + custody binding
      ↓
Vesting calculation
      ↓
Claim authorization
      ↓
Replay/idempotency checks
      ↓
Finalized chain evidence
      ↓
Persistent accounting record
```

Allocation claims are beneficiary-bound and cannot exceed the amount vested at the requested timestamp. Claim IDs and finalized transaction IDs are durable replay keys.

Treasury execution supports policy-defined independent approval thresholds, timelocks, purpose allowlists, per-movement limits, expiry, governance references, and transaction evidence. `config/treasury-policy.example.json` is deliberately a template and must not be interpreted as approved Mainnet governance.

See [Tokenomics enforcement](docs/tokenomics-enforcement.md).

## Token release checklist

```bash
pnpm token:metadata:generate
pnpm token:registry:generate
pnpm token:assets:verify
pnpm token:schemas:validate
pnpm token:integrity:verify
pnpm token:validate
pnpm token:typecheck
pnpm token:test
pnpm token:security:audit
pnpm token:tokenomics:validate
```

Or run the aggregate gate:

```bash
pnpm token:check
```
