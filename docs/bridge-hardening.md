# JARVIS bridge hardening

Canonical JARVIS originates on Sui. The Solana Token-2022 representation begins with zero genesis supply and may only become outstanding against verified canonical backing.

Required invariants:

- canonical locked amount equals bridged outstanding amount plus valid in-flight mint adjustments minus valid in-flight release adjustments;
- message identifiers and source transaction digests are idempotent;
- source finality is verified before destination mint/release;
- wallet/payment addresses and coin types are allowlisted from deployment configuration;
- burn-and-release never releases more canonical JARVIS than the verified wrapped burn;
- canonical quarterly supply burns are distinct from bridge representation burns and must not be counted as bridge redemptions;
- no browser bundle receives payout, relayer, signer, or treasury secrets;
- failed/timed-out destination operations remain recoverable and auditable.
