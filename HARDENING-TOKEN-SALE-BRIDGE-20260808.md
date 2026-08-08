# JARVIS Token Sale & Bridge hardening — 2026-08-08

## Added
- standalone `apps/token-sale` Next.js application boundary
- typed sale phases, accepted assets and integer-only prices
- fail-closed sale enablement and purchase execution
- server-only safety, rate-limit and cache helpers
- Sui gas/effects and transaction-target safety utilities
- embedded-wallet adapter boundary
- responsive hook, loading, error, global-error and not-found surfaces
- terms, privacy, cookies and disclaimer routes with pre-launch counsel placeholders
- 5B JARVIS (25% of 20B) sample sale allocation, disabled by default
- `types/burn.ts`, `functions/burn.ts`, `data/burning/policy.json`
- 2% maximum canonical burn per 90-day window
- bridge reserve invariant helper and bridge hardening documentation
- fail-closed `scripts/contract-publish.sh`
- DeepBook integration placeholder package and tests

## Changed
- canonical Sui coin design now seals TreasuryCap inside a module-private `BurnAuthority` instead of consuming it, enabling burn-only use without a post-genesis public mint entry
- Move edition declarations updated from `2024.beta` to `2024`
- monetary policy records canonical burning as enabled with a 200 bps / 90-day ceiling and no remint
- integrity manifest regenerated for the hardened tree

## Critical production rule
Because a retained TreasuryCap could be used by code introduced through a future package upgrade, production finalization requires destroying the Sui package UpgradeCap after the intended bytecode/source has been independently verified. Do not enable the public sale before this and all sale/legal deployment gates are satisfied.

## Verification completed in this environment
- Node test suite: 64/64 passing
- TypeScript root typecheck: passing
- 20B supply validator: passing
- token upgrade validator: passing
- Sui profile validator: passing
- token validator: passing
- schema validator: passing
- integrity verification: passing (151 files)

## Not verified here
- Sui Move compilation/publish: Sui CLI is not installed in this runtime
- standalone Next.js sale build: app dependencies are intentionally not installed in the token-core runtime
- production chain identifiers and legal approvals: remain unset/fail-closed
