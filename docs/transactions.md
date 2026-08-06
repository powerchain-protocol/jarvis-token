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

Refunds require a confirmed AI payment, reverse the same parties on the same
chain/network/asset, reference the original on-chain transaction, and cannot exceed the
original amount. The builder sums all existing non-failed refunds so multiple
partial refunds cannot cumulatively exceed the payment; the caller must supply
the complete durable refund history.

Actual transaction construction, simulation, fee calculation, signing, MPC
share handling, broadcast, and RPC finality observation belong in separately
reviewed chain adapters. Never give an LLM or agent access to private keys.
