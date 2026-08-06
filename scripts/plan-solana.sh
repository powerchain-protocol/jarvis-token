#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <config.json> <output.json>" >&2
  exit 64
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_path="$1"
output_path="$2"

cd "$repo_root"
npm run jarvis -- plan-solana-wrapped --config "$config_path" --out "$output_path"
