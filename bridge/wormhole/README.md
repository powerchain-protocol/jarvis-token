# JARVIS Wormhole NTT integration

JARVIS originates only on Sui. Publication creates exactly
18,440,000,000,000,000 base units and irreversibly removes the TreasuryCap.
Solana represents locked Sui JARVIS with a Token-2022 mint whose genesis supply
is zero.

## Transfer lifecycle

Sui to Solana: the upstream NTT manager takes JARVIS into custody, emits a
transfer message, approved transceivers attest it, and the Solana NTT manager
mints the same base-unit amount. Solana to Sui reverses this: NTT burns wrapped
JARVIS, then releases the matching Sui coins from custody. Replay protection,
registered peers, thresholds, pausing, and rate limits are bridge concerns and
must remain enabled.

The accounting identity is:

`Solana wrapped + in-flight Sui→Solana + in-flight Solana→Sui = Sui locked`

and `Sui circulating + Sui locked = 18,440,000,000,000,000` at all times.

## Deployment policy

- Use the official, pinned Wormhole NTT release; do not copy bridge contracts
  into this repository.
- Test both directions with small amounts, duplicate messages, pausing, rate
  limits, and failed relays before raising limits.
- Derive and independently compare the Solana NTT token-authority PDA before
  accepting the checked authority handoff. Never use an unchecked handoff.
- The local Solana planner intentionally does not build an authority-transfer
  instruction. Use only the pinned upstream NTT checked set/claim workflow.
- Put Sui AdminCap/UpgradeCap and Solana manager ownership under reviewed
  multisigs. Separate operators, deployers, relayers, and verifiers.
- Keep mainnet paused with zero limits until package IDs, peers, transceivers,
  authority state, bytecode, simulations, and evidence receive independent
  approval. This repository generates plans and never broadcasts.

Queued outbound transfers on Sui/Solana may lack a user cancellation path in
some NTT releases. Treat this as a release-blocking version check: pin a version,
confirm its behavior, monitor queues, use conservative limits, and document an
operator recovery procedure. An established bridge reduces implementation risk;
it does not replace a project-specific security review.

## Off-chain transfer logic

`packages/token-core/src/bridge/transfer.ts` provides a pure, non-signing state
machine for operators and clients. It rejects transfers while paused, zero or
over-limit amounts, reused transfer IDs, mismatched message digests, duplicate
message digests, unregistered or duplicate transceiver attestations, impossible
threshold configurations, exhausted aggregate rate-limit windows, out-of-order
timestamps, repeated attestation IDs, and redemption before the threshold.
Stuck transfers move to `manual-review` and remain counted as in-flight; the
library never pretends they were cancelled or silently releases collateral.
In-flight aggregation also rejects duplicate transfer IDs or message digests so
the same bridge obligation cannot be counted twice.
