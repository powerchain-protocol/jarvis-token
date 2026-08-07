# JARVIS Tokenomics

**Version:** `1.0.0-rc.0`  
**Status:** release-candidate policy; final distribution is not approved or published.

The normative implementation-oriented specification is [docs/tokenomics.md](docs/tokenomics.md). Enforcement details are documented in [docs/tokenomics-enforcement.md](docs/tokenomics-enforcement.md).

## Frozen monetary policy

| Property | Value |
| --- | ---: |
| Asset | JARVIS |
| Decimals | 6 |
| Maximum supply | 18,440,000,000 JARVIS |
| Base-unit supply | 18,440,000,000,000,000 |
| Canonical chain | Sui |
| Solana representation | Token-2022 · Wormhole NTT |
| Solana genesis representation supply | 0 |
| Inflation | None |
| Bridge backing | Exact 1:1 |

## Supply model

```text
Canonical Sui supply = 18,440,000,000 JARVIS

Sui → Solana:
canonical JARVIS locked
        =
bridged JARVIS minted

Solana → Sui:
bridged JARVIS burned
        =
canonical JARVIS released
```

Bridging changes representation and location; it does not create additional global JARVIS.

## Allocation status

This release intentionally does **not** invent final allocation percentages. An approved allocation must:

- total exactly 10,000 basis points;
- total exactly 18,440,000,000,000,000 base units;
- use explicit integer rounding adjustments;
- identify beneficiary class, custody and governance evidence;
- include independent reviewers;
- define vesting/claim rules where applicable;
- produce a deterministic allocation commitment.

## Claims and treasury

Allocation claims are beneficiary-bound, vesting-aware and replay-resistant. Treasury movements redistribute existing JARVIS only and cannot alter the fixed supply.

Production treasury governance must explicitly approve approval thresholds, timelocks, purpose restrictions, limits, custody and operational authorities before Mainnet execution.
