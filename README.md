# JARVIS Tokenomics

| Property | Value |
|---|---|
| Asset name | Jarvis AI |
| Symbol | JARVIS |
| Version | 1.0.0-beta.0 |
| Status | Configuration-ready; deployment not verified |
| Solana standard | Token-2022 |
| Sui implementation | Move coin |
| Decimals | 6 |
| Maximum supply | 18,440,000,000 JARVIS |
| Maximum base units | 18,440,000,000,000,000 |
| Monetary model | Fixed supply |
| Additional minting | Not permitted after authority revocation or TreasuryCap destruction |

## Purpose

JARVIS is the provider-independent utility and accounting asset for Jarvis AI
services. Intended uses include:

- AI credits
- chat, vision, audio, image, and video usage
- agents and skills
- compute and storage
- marketplace purchases
- protocol incentives
- approved governance and treasury operations
- PowerPay-supported settlement where enabled

The token does not by itself represent equity, debt, ownership of PowerChain,
or a guaranteed claim on revenue.

## Network profiles

### Solana

The canonical Solana profile uses Token-2022. It can use extensions while
remaining compatible with standard token accounts and associated token
accounts.

Canonical program addresses:

| Program | Address |
|---|---|
| System Program | `11111111111111111111111111111111` |
| SPL Token Program | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| Token-2022 / Token Extensions Program | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| Associated Token Account Program | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` |
| Metaplex Token Metadata Program | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` |

The Metaplex Token Metadata Program is separate from the SPL Token and
Token-2022 programs. It owns metadata accounts derived for a mint. Token-2022
can additionally store Token Metadata through its metadata extension and
Metadata Pointer extension. The implementation must clearly identify which
metadata mechanism is canonical and keep both representations consistent when
both are used.

### Sui

The Sui profile uses a Move coin package. Fixed supply requires minting the
complete supply and then destroying the TreasuryCap, or applying another
audited and governance-approved irreversible lock.

## Supply integrity

The repository freezes these constants:

```text
decimals = 6
maximum whole-token supply = 18,440,000,000
maximum base-unit supply = 18,440,000,000,000,000
```

A deployment is conformant only when:

1. the mint or coin type matches the published deployment record;
2. total supply exactly matches the fixed constant;
3. the full initial allocation is accounted for;
4. Solana mint authority is revoked;
5. Solana freeze authority is revoked or was never configured;
6. Sui TreasuryCap is destroyed for the fixed-supply profile;
7. metadata identity is consistent;
8. transaction signatures or digests are published;
9. an independent verifier confirms the on-chain state.

## Distribution

No final allocation schedule is asserted in this release. Before deployment,
the approved token allocation must define, at minimum:

- ecosystem and public distribution
- team and contributor vesting
- development and operations
- treasury
- liquidity
- marketing and partnerships
- reserve
- AI-credit and user incentives

Percentages must total exactly 100%. Every locked allocation must identify the
beneficiary class, unlock date, cliff, vesting curve, custody account, and
enforcement mechanism.

## AI credits

JARVIS and platform AI credits are related but distinct:

- JARVIS is an on-chain asset.
- AI credits are an internal usage-denominated accounting unit.
- Conversion rates may vary by product, provider cost, plan, region, and
  commercial schedule.
- Purchasing credits must not silently create or destroy JARVIS supply.
- Refund, expiration, promotion, and enterprise-credit policies are recorded in
  the billing ledger.

## Authority policy

Production deployment should use:

- dedicated fee payer
- hardware-backed or MPC-controlled authorities
- separate mint and metadata authorities
- a reviewed mainnet change ticket
- transaction simulation
- independent transaction verification
- revocation receipts
- published explorer links

Private keys and seed phrases must never be committed to the repository,
embedded in Docker images, or included in deployment JSON.

## Metadata

Canonical metadata:

```text
packages/token-core/src/metadata/jarvis.metadata.json
```

Deployment evidence:

```text
packages/token-core/src/metadata/jarvis.deployments.json
```

A metadata record is not verified until it includes the mint, metadata account,
transaction signature, authority state, and observation timestamp.

## Mainnet status

The repository includes mainnet-capable transaction builders and guarded
deployment profiles. It does not claim that a JARVIS mint, Sui package, fixed
supply, metadata account, or authority revocation has been completed on
mainnet. Mainnet addresses must be added only after confirmed deployment and
independent verification.
