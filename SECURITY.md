# Security policy

JARVIS is security-sensitive financial infrastructure. Report vulnerabilities
privately to the PowerChain Foundation security contact configured for the
deployment program. Include affected version, network, identifiers, impact,
and reproduction steps. Never include private keys or seed phrases.

## Supported status

Version `1.0.0-rc.0` is a production candidate, not a supported mainnet
deployment. Mainnet remains blocked while any high/critical production
dependency advisory is unresolved, unless a named security owner records a
time-limited risk acceptance with exploitability analysis and compensating
controls in the controlled change system.

The legacy Solana SDK tree currently reports `bigint-buffer` advisory
`GHSA-3gc7-fjrx-p6mg`, for which npm reports no fix. This release intentionally
fails `scripts/security-audit.sh` while that remains true. Prefer migration to a
maintained Solana client stack or an upstream fix; do not silently allowlist it.

Required controls include hardware-backed/MPC multisigs, separated roles, NTT
peer and threshold verification, continuous supply reconciliation, queue-age
monitoring, independent on-chain verification, and tested incident response.
