# Deployment targets

This directory contains reviewed, public-only target templates—not compiler
output and not evidence of deployment.

- `profiles/` contains network-specific configuration templates.
- `generated/` is ignored and receives unsigned local plans.
- `releases/` is ignored and receives source archives.

Never place keypairs, seed phrases, signing tokens, authenticated RPC URLs, or
unredacted custody-system responses here.
