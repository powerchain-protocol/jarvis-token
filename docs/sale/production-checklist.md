# JARVIS Token Sale production checklist

- [ ] Verify published Sui package ID, coin type, metadata object, sale object and treasury address from transaction evidence.
- [ ] Verify exactly 20,000,000,000 JARVIS genesis issuance (6 decimals) and no post-genesis public mint path.
- [ ] Verify the sealed burn authority enforces at most 200 bps per 90-day window.
- [ ] Destroy the Sui package UpgradeCap only after independent source/bytecode and deployment review.
- [ ] Keep `JARVIS_SALE_ENABLED=false` until the final enablement ceremony.
- [ ] Replace sample prices and phase dates with approved production values.
- [ ] Verify aggregate sale allocation cannot exceed 5,000,000,000 JARVIS unless tokenomics governance explicitly changes it before launch.
- [ ] Use a shared production Redis-compatible idempotency/rate-limit store; never rely on process memory across replicas.
- [ ] Dry-run/simulate purchase PTBs and verify final effects before crediting purchases.
- [ ] Pin supported payment coin types; do not trust symbol text from clients.
- [ ] Enforce wallet ownership and recipient-address validation.
- [ ] Add eligibility/jurisdiction/sanctions controls required by counsel and the intended offering jurisdictions.
- [ ] Counsel approves Terms, Privacy, Cookies, Disclaimer, risk disclosures, refund rules and marketing claims.
- [ ] Verify Wormhole/NTT bridge deployment independently; bridge burns remain distinct from canonical quarterly burns.
- [ ] Secret scan, dependency audit, typecheck, tests, build and deployment smoke tests are green.
