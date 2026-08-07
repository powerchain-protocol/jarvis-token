# JARVIS artwork

Canonical source artwork:

- `jarvis-green.png` — default canonical JARVIS token icon.
- `jarvis-logo-dark.png` — dark/blue theme variant.
- `jarvis-logo-light.png` — light/blue theme variant.

`generated/` is deterministic output. `pnpm token:logos:build` produces PNG and lossless WebP derivatives at 16, 32, 64, 128, 180, 192, 256, and 512 pixels. Applications should consume an appropriately sized generated asset instead of serving the 1500px master icon for small UI elements.

After editing a master asset, run:

```bash
pnpm token:prepare
```

This regenerates artwork, checksums, registry/integrity manifests, validates schemas, and synchronizes application runtime copies.
