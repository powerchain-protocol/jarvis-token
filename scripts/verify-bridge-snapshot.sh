#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <snapshot.json> <report.json>" >&2
  exit 64
fi
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
npm run jarvis -- verify-bridge-snapshot --file "$1" --out "$2"
