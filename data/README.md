# JARVIS token data

Deterministic derived data used by applications and tooling. `registry.json` is regenerated from canonical token config/tokenomics/metadata and carries a SHA-256 commitment. `health-policy.json` defines the token-level readiness/health check vocabulary.

Do not hand-edit derived registry values; run `pnpm token:registry:generate`.
