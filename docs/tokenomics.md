# JARVIS tokenomics

**Asset:** JARVIS (`JARVIS`)  
**Specification version:** `1.0.0-rc.0`  
**Status:** Configuration-ready release candidate; deployment and distribution
are not verified.

This document defines the monetary and accounting policy implemented by the
repository. It deliberately does not publish an unapproved allocation schedule,
promise token value, or claim a mainnet deployment.

## Executive summary

JARVIS is a fixed-supply utility and settlement asset for JARVIS platform services.
Exactly 18.44 billion canonical JARVIS are created once on Sui. The complete
initial supply is delivered to one configured treasury address, after which the
Sui `TreasuryCap` is destroyed. No canonical inflation function remains.

JARVIS on Solana is a Token-2022 wrapped representation. It begins with zero
supply and may be minted only by the verified Wormhole NTT authority after an
equal canonical amount is locked on Sui. Returning value to Sui burns wrapped
JARVIS before releasing canonical JARVIS. Cross-chain movement changes location,
not global supply.

JARVIS may pay for or account for AI services, but AI credits remain a separate
off-chain unit. Quotes, reservations, refunds, promotions, and credit expiry do
not create or destroy JARVIS.

## Monetary constants

| Property | Policy value |
|---|---:|
| Name | JARVIS |
| Symbol | JARVIS |
| Version | 1.0.0-rc.0 |
| Decimals | 6 |
| One JARVIS | 1,000,000 base units |
| Maximum whole-token supply | 18,440,000,000 JARVIS |
| Maximum base-unit supply | 18,440,000,000,000,000 |
| Monetary model | Fixed supply |
| Canonical chain | Sui |
| Initial canonical recipient | One configured treasury address |
| Solana standard | Token-2022 |
| Solana genesis supply | 0 bridged JARVIS |

The conversion is exact:

```text
18,440,000,000 × 10^6 = 18,440,000,000,000,000 base units
```

All protocol, bridge, AI-accounting, and evidence amounts are expressed as
unsigned integer base-unit strings. Floating-point token arithmetic is not a
valid accounting source.

Application integrations should use the exported exact helpers
`parseJarvisDecimal`, `parseJarvisBaseUnits`, `formatJarvisBaseUnits`,
`addJarvisBaseUnits`, and `subtractJarvisBaseUnits`. They reject exponent
notation and excess precision, enforce the fixed-supply ceiling, and prevent
negative subtraction results.

The same constants are published as machine-readable policy in
`token/config/tokenomics.policy.json`. `packages/token-core/src/tokenomics.ts` binds
allocation validation directly to the compiled token constants so a document
or template cannot redefine the supply.

## Supply creation and finality

### Canonical Sui issuance

The Sui package performs issuance only during package initialization:

1. Create the JARVIS currency and metadata.
2. Mint exactly `18,440,000,000,000,000` base units.
3. Transfer the complete coin to the publishing treasury address.
4. Convert the `TreasuryCap` into supply state and place it in a frozen
   `FixedSupply` object.
5. Freeze metadata.

The package exposes no later mint or burn entry point. A conformant deployment
must prove the `TreasuryCap` cannot be used and the treasury received the full
initial amount. An upgrade path must not be used to restore inflationary power.

### Bridged Solana representation

The Token-2022 mint begins with zero units and no freeze authority. Its mint
authority is handed to the independently derived Wormhole NTT token-authority
PDA. It is not revoked because bridge-controlled lock/mint and burn/release
require it.

Wrapped minting is representation, not monetary issuance:

| Direction | Canonical action | Bridged action | Global effect |
|---|---|---|---|
| Sui → Solana | Lock JARVIS in NTT custody | Mint equal Token-2022 units | None |
| Solana → Sui | Release equal JARVIS from custody | Burn Token-2022 units first | None |

No operator, treasury, metadata authority, AI agent, model provider, fee payer,
or application account is permitted to mint bridged JARVIS outside the audited
bridge path.

## Supply invariants

At every finalized observation checkpoint:

```text
Sui circulating + Sui locked = 18,440,000,000,000,000
Solana bridged + cross-chain obligations in flight = Sui locked
```

The implementation's snapshot convention must be used consistently when
classifying in-flight directions. Each obligation must have one unique transfer
ID and message digest so it cannot be counted twice.

A mismatch is a security incident. Operators must pause both bridge directions,
set limits to zero, preserve evidence, and reconcile finalized state. They must
not mint, burn, release, or reclassify value merely to make totals appear equal.

## Initial treasury custody

Before governance approves a final distribution, 100% of canonical supply is
held at one configured treasury address. This is a temporary custody policy,
not a final allocation and not a statement that the treasury may distribute
without controls.

Production treasury policy should require:

- hardware-backed multisig or reviewed MPC custody;
- participant and threshold separation from deployer and bridge roles;
- allowlisted transaction purposes and per-operation limits;
- hash-bound proposals, expiry, unique approvals, and durable audit records;
- independent review for changes to beneficiaries, vesting, liquidity, or
  bridge custody;
- public reconciliation reports without exposing keys or sensitive custody
  information.

Treasury transfers redistribute existing units; they never alter maximum or
total supply.

## Allocation policy

No final allocation percentages are asserted in this release candidate. Before
the first economic distribution, an approved allocation record must cover at
least:

| Allocation class | Required policy details |
|---|---|
| Ecosystem and public distribution | Eligibility, mechanism, jurisdictions, caps, timing |
| Team and contributors | Beneficiary class, cliff, vesting curve, custody |
| Development and operations | Budget period, approval authority, reporting |
| Treasury | Mandate, limits, diversification and custody rules |
| Liquidity | Venue, counterparty, position ownership, withdrawal controls |
| Marketing and partnerships | Milestones, clawbacks, disclosure obligations |
| Reserve | Permitted use, release conditions, emergency controls |
| AI-credit and user incentives | Eligibility, anti-abuse rules, duration, limits |

The completed percentages must total exactly 100%. Every locked allocation must
identify the base-unit amount, beneficiary or beneficiary class, custody
address, start date, cliff, unlock dates, vesting curve, enforcement mechanism,
revocation or clawback rules where applicable, and approving governance record.

### Allocation arithmetic

Convert approved percentages into integer base units using a documented
rounding method. The final remainder must be explicitly assigned so that:

```text
sum(all allocation base units) = 18,440,000,000,000,000
```

Do not publish a percentage-only table that cannot reconcile exactly to the
fixed base-unit supply.

Approved schedules use integer basis points (`10,000 = 100%`). Validate a final
schedule before review:

```bash
pnpm jarvis -- validate-allocation --file allocation-plan.json
pnpm jarvis -- commit-allocation --file allocation-plan.json --out artifacts/allocation-commitment.json
pnpm jarvis -- project-vesting --file allocation-plan.json --as-of 2027-01-01T00:00:00.000Z --claims claims.json --out artifacts/vesting-snapshot.json
pnpm jarvis -- verify-vesting-snapshot --snapshot artifacts/vesting-snapshot.json --file allocation-plan.json --claims claims.json
```

The validator requires exact percentage and base-unit totals, amount-to-basis-
point agreement, unique allocation IDs and reviewers, two independent reviewers,
an approval timestamp, non-placeholder custody identities, chronological
vesting, and consistent locked/immediate-vesting semantics. The file at
`target/allocation-plan.example.json` is intentionally an invalid draft until
its governance and custody placeholders are replaced and approval is recorded.

The commitment command canonicalizes allocation and reviewer order, hashes the
complete approved plan with SHA-256, and writes policy, category, percentage,
and base-unit totals. Publish this report with the approved plan and bind its
`allocationCommitmentSha256` into the final release evidence. Any change to a
beneficiary, custody address, amount, percentage, vesting term, approval, or
governance reference creates a different commitment.

The vesting projection command binds every report to that allocation commitment
and uses integer base-unit arithmetic. It reports vested, claimed, claimable,
and unvested supply for each allocation and for the complete fixed supply.
For production reporting, claims are a JSON event ledger containing `claimId`,
`allocationId`, `amountBaseUnits`, `claimedAt`, `transactionId`, `chain`,
`network`, `assetId`, `from`, `to`, `finalized`, `success`, and `observedAt`.
The source must equal the allocation's approved custody address. Chain-specific
networks, Sui addresses and coin types, Solana public keys, and chain-specific
transaction identifiers are validated. A claim cannot predate approval of its
allocation plan.
Each finalized claim also includes a chain/network-matched finalized block
anchor, binding the evidence to a Sui checkpoint or Solana slot rather than a
transaction identifier alone.
Only successful finalized receipts qualify. Legacy transaction or aggregate
inputs remain readable but are marked as legacy and do not qualify as strict
production evidence.

Every allocation used with finalized claim evidence must include a
`custodyBinding` containing `chain`, `network`, `assetId`, and `address`. The
binding is part of the allocation commitment. Its address must equal the
allocation's custody address, and every finalized claim must exactly match all
four fields. Older allocations without a binding remain readable but cannot
produce finalized production evidence.
Duplicate claim or transaction IDs, unknown allocations, non-canonical amounts,
and claims above the amount vested at the event timestamp fail closed. Linear vesting floors fractional base units; a cliff
blocks claims until its timestamp and then exposes the cumulative linear amount.
Milestone schedules must define unique milestone IDs whose amounts reconcile
exactly to the allocation and whose timestamps fall inside the vesting period.
Milestone order does not affect the allocation commitment. Event order does not
affect the claim-ledger or snapshot commitment.

Every snapshot includes category reconciliation, `claimLedgerSha256`, and
`snapshotSha256`. Changing an event amount, time, transaction, allocation,
schedule, or report timestamp changes at least one commitment. Publish the
claim ledger and snapshot together so independent reviewers can reproduce both
hashes.

An event enters an `asOf` snapshot only after its finalized receipt's
`observedAt` timestamp. A transaction claimed before the cutoff but finalized
or observed afterward is excluded. The claim-ledger commitment covers only the
events included at that cutoff, so adding later receipts cannot retroactively
change a previously published historical snapshot. `includedClaimEventCount`
makes the cutoff population explicit.

The verification command parses the report strictly and recomputes every field
from the approved allocation plan and complete claim ledger. It rejects changed
totals, categories, timestamps, commitments, allocations, unknown fields, or
different source evidence. Strict verification requires finalized chain events;
`--allow-legacy-aggregate` exists only for migration of older reports and must
not be used as production evidence.

This projection is an accounting report, not an on-chain balance oracle. A
published circulating-supply report must reconcile the snapshot with current
treasury custody, bridge state, and independently verified chain balances.

## Utility model

JARVIS is intended as a provider-independent utility and accounting asset for:

- chat and language-model usage;
- vision, image, audio, and video generation or processing;
- agents, skills, tools, and marketplace purchases;
- compute, storage, inference routing, and data services;
- protocol incentives and approved ecosystem programs;
- reviewed governance and treasury operations;
- PowerPay-supported settlement where enabled.

Utility access does not guarantee demand, liquidity, price, service
availability, provider support, or governance rights. Individual products may
accept fiat, credits, JARVIS, or other approved payment methods.

## JARVIS and AI credits

JARVIS and platform AI credits are related but distinct:

| JARVIS | AI credits |
|---|---|
| On-chain transferable asset | Internal usage-denominated accounting unit |
| Fixed global supply | Issued and adjusted under billing policy |
| Chain balance and transaction history | Platform ledger balance and receipts |
| May be bridged between supported chains | Not necessarily transferable or bridgeable |
| Does not expire at protocol level | May have plan-specific expiry terms |

Conversion rates may vary by provider cost, model, modality, product, plan,
region, or commercial schedule. Rates must be versioned, time-bounded where
appropriate, and stated in integer JARVIS base units. The accounting layer
rounds charge components upward to a base unit and rejects any quote above the
global fixed supply.

Purchasing, refunding, expiring, or promoting credits must not silently mint or
burn JARVIS. A JARVIS payment and its corresponding credit entry are separate,
reconcilable ledger events.

## Fees, revenue, burns, and staking

This release defines no protocol-level transfer tax, automatic burn, reflection,
rebasing, staking yield, revenue share, or guaranteed buyback. Standard Sui,
Solana, bridge, relayer, marketplace, provider, and application fees may still
apply and must be disclosed by the service charging them.

Any future burn, staking, fee-routing, incentive, or governance design would
require a separate specification, economic analysis, security review,
implementation, migration and compatibility assessment, and explicit approval.
It must not contradict the fixed maximum supply or create unbacked wrapped units.

## Governance and authority limits

Token ownership alone does not grant governance power in this release. No
on-chain voting, delegation, quorum, proposal execution, or staking-governance
mechanism is asserted.

Administrative governance is limited by operational policy:

- Sui canonical minting authority is irreversibly removed.
- Solana bridged minting is limited to the verified NTT authority.
- Freeze authority is absent.
- Metadata and bridge administration use separated, reviewed authority paths.
- Mainnet signing requires simulation, multisig/MPC approval, and independent
  evidence review.

No governance vote or administrator may legitimately waive the collateral
invariant and mint unbacked bridged JARVIS.

## Transparency and reporting

Once deployed, a public supply report should include:

- Sui package ID, coin type, fixed-supply object, treasury and publish digest;
- Sui circulating and bridge-locked balances at finalized checkpoints;
- Solana mint, token program, supply, authorities and metadata identity;
- bridge managers, peers, transceivers, modes, thresholds and pause state;
- unique in-flight obligations and reconciled totals;
- treasury balances and distribution against the approved allocation;
- transaction digests/signatures, timestamps, RPC sources and reviewer;
- source, bytecode, configuration, metadata and release artifact hashes.

Observations should be repeated through independent RPC providers. Explorer
pages are convenient references but do not replace signed evidence and raw
finalized-state verification.

## Deployment conformance

A JARVIS deployment is conformant only when an independent verifier confirms:

1. The published Sui coin type and Solana mint match the approved record.
2. Canonical supply equals `18,440,000,000,000,000` base units.
3. The initial treasury received the complete canonical supply.
4. The Sui `TreasuryCap` is unusable and metadata is frozen.
5. Solana genesis supply was zero and freeze authority is absent.
6. Solana mint authority is the verified NTT token-authority PDA.
7. NTT modes, reciprocal peers, transceivers, thresholds, and limits match the
   reviewed configuration.
8. Circulating, locked, wrapped, and in-flight amounts reconcile exactly.
9. Metadata identity is consistent and binds release `1.0.0-rc.0`.
10. Deployment transactions, artifact hashes, observation time, and two-person
    review are published in the evidence record.

Until those conditions are met, references to JARVIS mainnet addresses, supply,
metadata accounts, authority revocation, or bridge availability are unverified.

## Risk and legal disclosures

JARVIS does not by itself represent equity, debt, ownership of PowerChain,
intellectual-property rights, a deposit, or a guaranteed claim on revenue. This
document is a technical monetary-policy specification, not investment, legal,
tax, or financial advice.

Risks include contract or bridge defects, compromised custody, incorrect peers
or authorities, relayer outages, stuck transfers, rate-limit exhaustion, RPC
deception, metadata inconsistency, dependency vulnerabilities, regulatory
change, service discontinuation, liquidity loss, and total loss of token value.
An established bridge reduces implementation risk but does not remove the need
for project-specific audit, testnet acceptance, monitoring, and incident response.

## Items intentionally undecided

The following are not approved or claimed by `1.0.0-rc.0`:

- final allocation percentages or recipient addresses;
- sale, listing, launch, liquidity, or market-making terms;
- vesting dates or contributor grants;
- token-based voting or staking;
- fee sharing, yield, buybacks, or burns;
- fiat or AI-credit conversion rates;
- deployed Sui package, Solana mint, metadata account, or NTT addresses;
- mainnet transaction signatures, digests, explorer links, or launch date.

These fields must remain absent or explicitly marked unverified until approved
and independently evidenced.
