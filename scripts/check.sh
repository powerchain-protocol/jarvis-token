#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

npm_cache="${JARVIS_NPM_CACHE:-${TMPDIR:-/tmp}/jarvis-npm-cache}"
npm ci --cache "$npm_cache"
npm run check
npm test
npm run build

if command -v sui >/dev/null 2>&1; then
  sui move test --path contracts/jarvis
  sui move test --path testnet-contract/jarvis
  sui move test --path packages/jarvis-sui
  sui move test --path contracts/walrus
else
  echo "warning: Sui CLI unavailable; skipped Move compilation and tests" >&2
fi

if rg -n --hidden \
  -g '!node_modules/**' \
  -g '!dist/**' \
  -g '!target/generated/**' \
  -e 'BEGIN [A-Z ]*PRIVATE KEY' \
  -e '\[[[:space:]]*[0-9]{1,3}(,[[:space:]]*[0-9]{1,3}){31,}\]' .; then
  echo "error: possible private key material detected" >&2
  exit 1
fi

echo "JARVIS checks passed"
