# Guarded transactions

The transaction module creates canonical, hash-bound intents. It does not sign
or broadcast. Each intent binds chain, network, asset, parties, amount, nonce,
business reference, metadata digest, creation time, and expiry.

Security rules include chain-specific address validation; positive fixed-supply
bounds; distinct sender/recipient; nonce, reference, and intent-ID replay
protection; canonical SHA-256 payloads; MPC proposal amount/hash/operation
binding; expiry before submission; exact finalized-receipt reconciliation; and
chronological submission/confirmation.
MPC authorization revalidates the policy, participants, unique approvals,
threshold, allowed operation, amount ceiling, and expiry; it never trusts an
`approved` status field by itself.

Every terminal transaction record requires a chain/network-matched finalized
block anchor. Sui uses a checkpoint sequence and checkpoint digest; Solana uses
a slot and blockhash. Block heights are canonical uint64 strings and hashes are
validated base58 values. The anchor is retained in persisted transaction data
for explorer correlation and independent finality review.

## Native network fees

An intent may bind a `networkFeeQuote`. Sui quotes are denominated in MIST as
native asset `SUI`; Solana quotes are denominated in lamports as native asset
`SOL`. These amounts are never added to, subtracted from, or represented as the
JARVIS transfer amount.

The quote binds its chain, network, estimate, authorized maximum, source digest,
quote time, and expiry into the intent digest. Authorization and submission
reject expired quotes. Finalized receipts must report the charged native fee,
which cannot exceed the signed maximum. Failed finalized transactions may still
record a network fee. Refund limits cover only the original JARVIS payment;
network fees are not silently refunded as JARVIS.

Refunds require a confirmed AI payment, reverse the same parties on the same
chain/network/asset, reference the original on-chain transaction, and cannot exceed the
original amount. The builder sums all existing non-failed refunds so multiple
partial refunds cannot cumulatively exceed the payment; the caller must supply
the complete durable refund history.

Actual transaction construction, simulation, fee estimation, signing, MPC
share handling, broadcast, and RPC finality observation belong in separately
reviewed chain adapters. Never give an LLM or agent access to private keys.
