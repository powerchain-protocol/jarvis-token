# Solana program profiles

JARVIS does not deploy a custom Solana program. It uses the audited, immutable
Token-2022 program plus the Associated Token Account and System programs.

The files under `mainnet/jarvis/` and `testnet/jarvis/` are public deployment
profiles. They are not program binaries, key material, or proof that a mint has
been deployed.

A custom program should be introduced only if future token behavior cannot be
implemented with standard Token-2022 instructions. Such a change requires a
new threat model, audit, program ID, upgrade-authority policy, and tokenomics
review.
