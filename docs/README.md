# JARVIS documentation

This documentation describes the `1.0.0-rc.0` production candidate. It does
not prove that JARVIS has been deployed, audited, or approved for mainnet use.

## Start here

| Audience | Read first | Then read |
|---|---|---|
| Developer | [Introduction](introduction.md) | [Installation](installation.md), [Architecture](architecture.md) |
| Token reviewer | [Tokenomics](tokenomics.md) | [Architecture](architecture.md), [Threat model](threat-model.md) |
| Testnet operator | [Deployment](deployment.md) | [Bridge operations](bridge-operations.md), [Verification](verification.md) |
| AI integrator | [AI utility](ai-utility.md) | [Guarded transactions](transactions.md) |
| Security reviewer | [Threat model](threat-model.md) | [Incident response](incident-response.md), [Security policy](../SECURITY.md) |

## Document map

- [Introduction](introduction.md): scope, trust model, and release status.
- [Architecture](architecture.md): canonical Sui supply, Solana wrapping, bridge,
  AI accounting, and responsibility boundaries.
- [Tokenomics](tokenomics.md): frozen constants, supply invariants, allocation,
  metadata, and conformance requirements.
- [Installation](installation.md): toolchain, build, test, and configuration.
- [Deployment](deployment.md): testnet procedure and guarded mainnet planning.
- [Bridge operations](bridge-operations.md): transfer lifecycle, reconciliation,
  monitoring, and failure handling.
- [Verification](verification.md): checks, evidence, deterministic release, and
  independent review.
- [AI utility](ai-utility.md): quotes, reservations, sessions, agents, and MPC.
- [Guarded transactions](transactions.md): intents, authorization, receipts, and
  refunds.
- [Threat model](threat-model.md) and [incident response](incident-response.md):
  preventive controls and emergency procedure.

## Terminology

- **Canonical JARVIS**: the fixed-supply Sui coin.
- **Wrapped JARVIS**: bridge-backed Token-2022 units on Solana.
- **Base unit**: one millionth of one JARVIS (`10^-6 JARVIS`).
- **NTT**: Wormhole Native Token Transfers, the selected bridge integration.
- **Plan**: unsigned, non-broadcast deployment or transaction material.
- **Evidence bundle**: independently reviewed deployment and state records.
