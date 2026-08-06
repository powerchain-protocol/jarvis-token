# Installation

## Requirements

- Node.js 20 or newer and npm
- Rust toolchain required by the selected Sui release
- Sui CLI pinned to the framework revision used for deployment
- Official Wormhole NTT CLI and contracts pinned to an independently reviewed release
- `rg`, `bash`, `sha256sum`, and Git

Do not install deployment tooling from unreviewed branches. Record exact
versions and checksums in the release change ticket.

## Build and test

```bash
npm ci
npm run check
npm test
npm run build
sui move test --path contracts/jarvis
sui move test --path testnet-contract/jarvis
bash scripts/production-readiness.sh config/mainnet.json config/ntt-mainnet.json
bash scripts/reproducibility-check.sh
bash scripts/security-audit.sh
```

`production-readiness.sh` rejects placeholders and cross-file mint/authority
mismatches, and deliberately fails when the Sui CLI is missing. A warning-only
TypeScript build is insufficient for a production candidate.

The dependency audit currently blocks this release candidate because the legacy Solana SDK
tree reports a high-severity advisory without an available npm fix. Do not
disable the gate; follow `SECURITY.md`.

## Configuration

Copy example JSON files outside source control, replace every placeholder, and
keep only public addresses in them. Never store keypairs, mnemonics, signing
tokens, or RPC credentials in repository files.

Use `bridge/wormhole/ntt.testnet.json` for the first deployment exercise. The
mainnet plan must remain paused and at zero rate limits until approval.
