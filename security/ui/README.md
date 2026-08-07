# JARVIS token UI

Token-specific presentation primitives keep Bridge, Asset Center, Portfolio, Explorer, Wallet Center, and marketing surfaces consistent without making UI code responsible for token identity.

## Product rules

- Display the ticker as **JARVIS** on every supported network.
- Use **Canonical** and **Bridged** badges instead of renaming the Solana representation.
- Sui is always canonical; Solana is the official Wormhole-backed bridged representation.
- Use the green JARVIS master icon as the canonical default. Dark and light variants are theme alternatives, not different assets.
- Responsive assets are generated as PNG and lossless WebP in 16/32/64/128/180/192/256/512px sizes.
- Never infer identity from a ticker or logo. Resolve canonical asset ID plus verified chain address.
- Missing deployment identities render as **Not configured**, never as fake addresses.
- A verified identity with a paused route renders **Bridge paused**, not Operational.

## Components

Recommended shared components:

```text
TokenIcon
TokenIdentity
RepresentationBadge
TokenAmount
TokenStatusBadge
TokenCard
TokenSkeleton
TokenAction
```

`token-presentation.ts` provides representation-aware labels, status models, accessible names, and compact-address formatting. `tokens.css` includes light/dark variables, mobile card behavior, keyboard focus styles, reduced-motion support, state badges, and skeleton loading.
