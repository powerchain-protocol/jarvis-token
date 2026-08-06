# JARVIS AI utility

JARVIS is an AI utility token: it can denominate provider-independent chat,
LLM, image, audio, video, compute, storage, and agent services. It is not an AI
model, equity, or a guaranteed claim on provider revenue.

## Usage flow

1. Select a versioned provider/model price schedule.
2. Quote multimodal usage using integer JARVIS base units.
3. Reserve no more than the available balance with an idempotency key.
4. Run the model or agent outside this package.
5. Record usage and content digests, not prompts, in the token ledger.
6. Settle actual usage up to the reservation, or cancel it.
7. Submit payment through a separately authorized on-chain service.

Quotes round each component upward to a base unit and have explicit schedule
times. A quote never transfers tokens or changes supply.
Usage counters must be exact safe integers, and every rate, quote, balance,
budget, reservation, settlement, and MPC payment is bounded by the canonical
18,440,000,000,000,000 base-unit fixed supply. Non-canonical integer strings,
overflowing quotes, and malformed persisted amounts fail closed.
Reserve, settle, and cancel operations are idempotent for identical retries and
reject conflicting retries, including session changes or changed charge amounts.
Every mutation revalidates persisted ledger/session state: identifier uniqueness,
reservation status fields, charge ceilings, reserved balance, turn/digest
uniqueness, receipt totals, and budgets. Corrupted database records fail closed.

Tokenized sessions have an owner, optional agent ID, JARVIS budget, cumulative
spend, and digest-only turn receipts. Duplicate turns and overruns are rejected.
Agents must never receive wallet keys or unrestricted signing authority.

The MPC module models participants, operations, thresholds, payment ceilings,
proposal digests, expiry, and unique approvals. It does not implement MPC
cryptography, hold shares, or sign. Connect it only to reviewed hardware/MPC
custody, and never send shares to an LLM.
Pending proposals are revalidated before each approval so fabricated prior
participants, duplicate approvals, or inconsistent thresholds cannot advance.
Payment operations require a positive amount; bridge-pause proposals require
exactly zero so an administrative action cannot be confused with a transfer.

AI credits remain separate internal units. Credit purchases, promotions,
refunds, or expiry must not mint or burn JARVIS.
