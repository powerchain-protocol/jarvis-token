# Verification and release evidence

## Local validation

```bash
npm ci
npm run check
npm test
npm run build
sui move test --path contracts/jarvis
sui move test --path testnet-contract/jarvis
bash scripts/security-audit.sh
bash scripts/production-readiness.sh config/mainnet.json config/ntt-mainnet.json
```

The production-readiness and security scripts are fail-closed gates. A known
high-severity advisory currently blocks this release candidate; see `SECURITY.md`.

## Read-only chain verification

```bash
npm run jarvis -- verify-solana \
  --rpc-url <RPC_URL> \
  --mint <MINT> \
  --bridge-authority <NTT_AUTHORITY> \
  --metadata-uri <URI> \
  --out artifacts/verify-solana.json

npm run jarvis -- validate-evidence --file evidence.json
npm run jarvis -- validate-release-evidence --file release-evidence.json
```

Use credential-free RPC origins in recorded commands. Verification output is
only as trustworthy as its RPC source, finality selection, inputs, and reviewer.
Repeat critical observations using an independent provider.

## Evidence requirements

The final bundle must include:

- network and finalized observation time/checkpoints;
- Sui package, coin type, treasury, fixed-supply object, supply, and publish
  digest;
- Solana mint, token program, metadata identity, supply, authorities, treasury
  account, and creation signature;
- NTT managers, modes, peers, transceivers, thresholds, limits, and authority
  handoff evidence;
- both-direction test transfers and reconciliation snapshots;
- source, configuration, bytecode/plan, metadata, and release hashes;
- the deterministic approved-allocation commitment and reconciled category totals;
- simulation results, security assessment references, change approval, and two
  distinct reviewers.

Do not edit a template to say `verified`; populate independently observed
values and retain the evidence used to derive them.

## Deterministic release

```bash
bash scripts/reproducibility-check.sh
bash scripts/verify-release.sh \
  target/releases/jarvis-token-1.0.0-rc.0.tar.gz \
  target/releases/SHA256SUMS
```

The packager normalizes file order, ownership, permissions, timestamps, and
gzip metadata. It emits a source manifest and archive checksum. Reproducibility
proves the same inputs produce the same archive; it does not prove correctness,
security, or on-chain deployment.

## Independent review

The deployer and verifier must be different people or controlled roles. The
verifier should obtain identifiers independently, reproduce hashes, inspect raw
finalized state, reconcile supply, and sign the evidence record only after all
gates pass. Explorer links are useful references but not sufficient evidence by
themselves.
