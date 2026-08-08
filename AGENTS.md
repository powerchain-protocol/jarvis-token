# AGENTS.md — JARVIS Token

Guidance for AI coding agents and contributors working in this repository. This repository is the canonical source tree for the **JARVIS** AI token: token identity, monetary policy, canonical **Sui** issuance code, the official **bridged Token-2022 representation on Solana**, metadata, and artwork.

## Canonical model (never break these invariants)

```text
JARVIS
├── Sui
│   ├── type: canonical
│   ├── decimals: 6
│   └── fixed supply: 20,000,000,000 whole tokens (20,000,000,000,000,000 base units)
└── Solana
    ├── type: bridged
    ├── provider: Wormhole NTT
    ├── standard: Token-2022
    └── genesis supply: 0
```

- Cross-chain invariant is exact **1:1 backing**. SUI/SOL gas and priority fees are separate transaction costs and never reduce the JARVIS amount represented.
- The canonical Sui package mints the complete 20B maximum supply at publication and seals the `TreasuryCap` inside the module-private `BurnAuthority`. There is **no public mint path after init**. The only post-genesis cap-backed operation is a burn capped at 2% per 90-day window. Production finalization requires destroying the package `UpgradeCap` after source/bytecode verification so a future upgrade cannot add a mint path.
- The Solana Token-2022 mint starts at zero supply; its mint authority is the verified Wormhole NTT bridge authority and its freeze authority must be disabled.
- User-facing ticker is always **JARVIS** with a `Canonical` or `Bridged` badge. Never introduce `wJARVIS` or any wrapped naming.

## Repository layout

```text
common/               provider-neutral types (Result, errors, asset types)
constants/            frozen identity, supply, network, and route constants
context/              deployment/environment context (createJarvisTokenContext)
functions/            pure token business functions (supply, reserve, allocation,
                      vesting, treasury, claims, deployment readiness, quotes)
security/             activation, authority, secret policy, runtime fail-closed gate
services/             monitoring, pricing, claim, and tokenomics orchestration
storage/              provider-neutral storage contracts (optimistic versioning)
ui/                   token presentation helpers and token CSS
utils/                precision, identity, hashing helpers
validation/           canonical asset-model validation
config/               asset.json, tokenomics.policy.json, allocation-policy.json,
                      deployments/{mainnet,testnet}.json (fail-closed templates)
contracts/jarvis_token/sources/jarvis.move  only authoritative Sui Move module
contracts/mainnet/                     Mainnet Move/deployment profile
contracts/devnet/                      Devnet Move/deployment profile
programs/solana/      Token-2022 representation profiles (mainnet/testnet JSON)
database/schemas/     portable JSON persistence schemas
metadata/             canonical metadata and integrity/asset/logo manifests
assets/               canonical artwork + generated runtime sizes
scripts/              build/validation tooling (.mjs / .py / .sh)
tests/                node:test suites (*.test.ts)
```

## Build, test, and validate

This package is dependency-light TypeScript (`"type": "module"`) and intentionally does **not** import Sui, Solana, Wormhole, wallet, or RPC SDKs. Node 20+ with `--experimental-strip-types` is sufficient.

```bash
pnpm typecheck            # tsc -p tsconfig.json --noEmit
pnpm test                 # node --experimental-strip-types --test tests/*.test.ts
pnpm validate:upgrade     # node scripts/validate-token-upgrade.mjs
pnpm check                # typecheck + test + upgrade validation
```

Useful individual validators (run from the repository root):

```bash
node scripts/validate-token.mjs                   # canonical model validation
node scripts/validate-sui-contract-profiles.mjs   # single-source mainnet/devnet profile check
node scripts/validate-monitoring.mjs              # live-monitoring safety gate checks
node scripts/validate-claims-pricing.mjs          # claim & pricing safety checks
node scripts/validate-tokenomics-enforcement.mjs  # allocation/vesting/treasury checks
node scripts/validate-schemas.mjs                 # database schema validation
node scripts/verify-assets.mjs                    # artwork verification
node scripts/verify-integrity.mjs                 # integrity manifest verification
node scripts/security-audit.mjs                   # secret/authority policy audit
```

Always run `pnpm check` before considering a change complete.

## Sui contracts (canonical source + mainnet/devnet profiles)

- `contracts/jarvis_token/sources/jarvis.move` is the **only** JARVIS Move source. `contracts/mainnet/Move.toml` and `contracts/devnet/Move.toml` are profile manifests consumed by the preparation script; do not add source mirrors under either profile directory.
- Frozen constants in the Move source: `DECIMALS = 6`, `MAXIMUM_WHOLE_SUPPLY = 20_000_000_000`, `MAXIMUM_BASE_UNITS = 20_000_000_000_000_000`. These match `constants/monetary.ts` and `config/tokenomics.policy.json` — keep all three in sync.
- The module keeps `coin::total_supply`, `decimals()`, `maximum_whole_supply()`, `maximum_base_units()`, burn-policy views, and the sealed `BurnAuthority`. Upgrades must preserve the 20B maximum issuance, absence of post-genesis mint entry points, 2%/90-day burn ceiling, and permanent no-remint policy.

## Upgrade validation

`scripts/validate-token-upgrade.mjs` protects the upgrade-sensitive invariants. Any change to contracts, supply accounting, or deployment profiles must keep it green:

- corrected reverse-route reserve equation (`bridgedSolanaBaseUnits + pendingForward + pendingReverse` in `functions/supply.ts`);
- canonical Sui / bridged Solana role split in `functions/deployment.ts` (`canonicalSuiDeploymentReadiness`, `bridgedSolanaDeploymentReadiness`, `deploymentReadiness`, `tokenRuntimeReadiness`);
- single canonical Sui source with mainnet/devnet profiles;
- fixed-supply constants and `TreasuryCap` consumption;
- fail-closed deployment templates: `config/deployments/{mainnet,testnet}.json` must keep `bridge.enabled`, `sui.verified`, and `solana.verified` all `false` until real on-chain identities are independently verified.

## Bridge & runtime safety

- Supported canonical routes only: `jarvis:sui:solana:wormhole-ntt` and `jarvis:solana:sui:wormhole-ntt`. Sui → Solana locks canonical JARVIS and mints the bridged representation; Solana → Sui burns the bridged representation before canonical assets are released.
- `JARVIS_BRIDGE_ENABLED=true` is only a request to activate transfers. Effective activation additionally requires deployment readiness, verified Wormhole routing, reserve monitoring, and emergency-pause configuration. `createJarvisTokenContext()` exposes both `requestedBridgeEnabled` and the effective `bridgeEnabled` — never conflate them.
- A positive reserve delta (bridged supply exceeding canonical backing, after including pending in-flight amounts) is **critical** and must fail closed.
- Claims are destination-chain redemptions, not a second transfer: they require a verified attestation, exact transfer identity/recipient/amount, and replay protection (Sui redeemed-message table; Solana message-hash receipt PDA).
- Market prices are informational only and never change the exact 1:1 amount. Return "price unavailable" rather than inventing a fallback price.
- Token amounts are integer base-unit strings at persistence boundaries; storage writes use optimistic versions and stale writers must fail with `STORAGE_CONFLICT`.

## Secret and key policy

- Never commit private keys, recovery phrases, authority keypairs, provider secrets, or `sui.keystore` contents into Git, `.env` files, CI, logs, or documentation. Signing keys belong in KMS/HSM.
- Only fund **public testnet/devnet addresses** through `https://faucet.sui.io`.

## Notes for agents

- `security/` contains only the token security modules (`activation.ts`, `authorities.ts`, `manifest.ts`, `policy.ts`, `runtime-gate.ts`). Nested repository mirrors under `security/` are prohibited.
- Validator scripts resolve paths relative to the token root via `import.meta.url`, so they can run from any working directory.
- Runtime artwork under generated asset directories is produced from `assets/` — never edit generated copies directly.
