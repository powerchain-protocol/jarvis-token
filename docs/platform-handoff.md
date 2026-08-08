# JARVIS Platform handoff

The JARVIS website and AI Gateway consume this package as the canonical token-domain source.

- Fixed maximum supply: 20,000,000,000 JARVIS.
- Decimals: 6.
- Canonical chain: Sui.
- Official Solana representation: bridged Token-2022 JARVIS.
- Bridge model: Sui lock/release ↔ Solana mint/burn, exact 1:1.
- Bridge implementation policy: Wormhole NTT; deployment identifiers remain verification-gated.
- AI availability is never a prerequisite for bridge operation.

Do not introduce a separate wJARVIS ticker unless the canonical token specification changes.
