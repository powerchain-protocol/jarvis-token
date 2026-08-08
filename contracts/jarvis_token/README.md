# Canonical JARVIS Move source

`contracts/jarvis_token/sources/jarvis.move` is the **only authoritative JARVIS Move source** in this repository.

Environment profiles live under `contracts/mainnet/` and `contracts/devnet/`. They contain the Move manifest and deployment policy for that environment; they do not carry a second copy of the token module.

Use the profile-preparation script to create an isolated build directory:

```bash
pnpm sui:prepare:mainnet
pnpm sui:prepare:devnet
```

The generated build tree is disposable and must never be treated as deployment evidence. Mainnet release evidence is governed separately by the deployment-evidence manifest/signature tooling.
