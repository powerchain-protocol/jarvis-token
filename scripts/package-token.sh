#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/../artifacts/jarvis-token-source.tar.gz}"
mkdir -p "$(dirname "$OUT")"
cd "$ROOT"
tar --sort=name --mtime='UTC 2026-01-01' --owner=0 --group=0 --numeric-owner --use-compress-program='gzip -n' -cf "$OUT" \
  README.md TOKENOMICS.md STRUCTURE.md assets common config constants context contracts data database docs functions metadata programs scripts security storage ui utils validation tsconfig.json
printf 'Packaged %s\n' "$OUT"
