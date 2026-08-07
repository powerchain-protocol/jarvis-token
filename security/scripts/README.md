# Token scripts

Token-local tooling is deliberately isolated from platform deployment scripts.

| Script | Purpose |
| --- | --- |
| `build-icons.py` | Generate deterministic PNG and lossless WebP icon derivatives. |
| `generate-asset-manifest.mjs` | Rebuild source/derivative artwork manifests with SHA-256 digests. |
| `generate-registry.mjs` | Rebuild the canonical asset registry commitment. |
| `generate-integrity-manifest.mjs` | Commit config, metadata, schemas, contracts, and program profiles into one SHA-256 manifest. |
| `validate-token.mjs` | Validate canonical identity, supply, metadata, representations, artwork, and layout. |
| `validate-schemas.mjs` | Validate portable JSON Schema conventions without external dependencies. |
| `verify-assets.mjs` | Re-hash canonical artwork and generated derivatives. |
| `verify-integrity.mjs` | Verify the deterministic integrity manifest. |
| `security-audit.mjs` | Scan the token subsystem for secret-like material and unsafe configuration. |
| `sync-assets.sh` | Synchronize canonical artwork into runtime application public directories. |
| `package-token.sh` | Create a deterministic token-only source archive. |

Generated files must be rebuilt from the canonical sources rather than edited by hand.
