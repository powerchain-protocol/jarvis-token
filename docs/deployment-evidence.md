# Production deployment evidence

JARVIS production deployment evidence is fail-closed. A release is not production-ready merely because a package or mint exists.

## Required identities

A Mainnet evidence set must bind the full Sui package ID, exact `package::module::JARVIS` coin type, metadata object, fixed-supply proof object and publish transaction digest. Solana evidence must bind the Token-2022 mint, Wormhole NTT manager program, JARVIS bridge program and the mint-authority key/PDA that is authorized only for bridged minting.

All Sui object/package identities use their full 32-byte lowercase form. Solana identities must decode to exactly 32 bytes.

## Canonical commitment

The deployment manifest uses deterministic `jarvis-canonical-json-v1` serialization. Object keys are sorted recursively and the manifest is committed with SHA-256. Signature evidence is stored outside the committed manifest so adding a release signature does not change the deployment identity commitment.

A manifest timestamp is canonical only when it is exactly equal to JavaScript `Date#toISOString()` output, for example:

```text
2026-08-08T05:08:00.000Z
```

Equivalent but non-canonical spellings are rejected.

## Signer evidence

Each signature record requires all of:

- signer identity;
- signature;
- signature algorithm;
- canonical signing timestamp.

Signer and signature are paired. Duplicate signer records are rejected. The token package verifies the commitment and the evidence structure; cryptographic signature verification is intentionally injected by release tooling because custody/HSM schemes vary by deployment.

## Commands

```bash
pnpm deployment:evidence:create -- manifest.json evidence.json signatures.json
pnpm deployment:evidence:verify -- evidence.json
pnpm validate:production-deployment
```

`deployment:evidence:verify` detects manifest tampering by recomputing the canonical SHA-256 commitment. Production release tooling should additionally provide a cryptographic signature verifier backed by the reviewed release-signing system.

## Invariants preserved

Deployment evidence cannot change monetary policy. JARVIS remains 20,000,000,000 fixed-supply tokens with 6 decimals. Canonical supply is created on Sui at genesis, canonical minting is impossible after finalization, Solana begins at zero bridged supply, and Wormhole NTT accounting remains exact 1:1 lock/mint/burn/release.
