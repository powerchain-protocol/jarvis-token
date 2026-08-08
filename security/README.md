# JARVIS token security boundary

This directory contains only the security policy modules for the standalone JARVIS token package:

- `activation.ts` — fail-closed bridge activation prerequisites.
- `authorities.ts` — Solana authority/freeze/genesis-supply policy.
- `manifest.ts` — deployment-manifest security contracts.
- `policy.ts` — public-secret and deployment identity policy.
- `runtime-gate.ts` — runtime transfer gate tied to monitoring health.
- `index.ts` — public exports.

Canonical token contracts, metadata, tests, configuration, and other domains live at repository root. A nested mirror of the repository under `security/` is prohibited because it creates stale security and contract copies.
