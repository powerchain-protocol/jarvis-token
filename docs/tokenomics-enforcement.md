# JARVIS tokenomics enforcement

This release deliberately does **not** publish final allocation percentages.

The `/token` package now enforces the accounting rules that an approved future
allocation must satisfy:

- 10,000 basis points exactly;
- 20,000,000,000,000,000 base units exactly;
- explicit integer rounding adjustments;
- unique allocation identities;
- custody identity for each allocation;
- governance record and at least two independent reviewers for approval;
- integer-only immediate, linear, or milestone vesting;
- claims never exceeding vested supply;
- treasury movements requiring governance evidence and independent approvals;
- circulating supply derived from explicit restricted-balance classes.

An allocation commitment hashes all economically meaningful fields. Changing an
amount, percentage, beneficiary class, custody identity, reviewer, or governance
record changes the commitment.

Treasury movements redistribute existing JARVIS only. They cannot mint supply.
Bridge custody is classified separately so moving JARVIS across Sui and Solana
does not create circulating supply twice.


## Claim and treasury security

Allocation claims are bound to the beneficiary identity committed in the
approved allocation. A request cannot change the allocation ID, beneficiary, or
claimable amount. Claim IDs and finalized transaction IDs are durable replay
keys and the repository contract requires atomic uniqueness enforcement.

Treasury execution supports policy-defined minimum approval thresholds,
timelocks, per-movement limits, purpose allowlists, expiry, and transaction
evidence. Validation is fail-closed: a movement that has not reached its
executable timestamp cannot be submitted by the tokenomics service.
