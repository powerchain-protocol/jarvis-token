#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
canonical="$repo_root/contracts/jarvis/sources/jarvis.move"

install -m 0644 "$canonical" \
  "$repo_root/testnet-contract/jarvis/sources/jarvis.move"
install -m 0644 "$canonical" \
  "$repo_root/packages/jarvis-sui/sources/jarvis.move"

echo "Synchronized JARVIS Move sources from contracts/jarvis"
