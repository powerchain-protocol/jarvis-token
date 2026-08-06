#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temporary_dir="$(mktemp -d)"
trap 'rm -rf -- "$temporary_dir"' EXIT

SOURCE_DATE_EPOCH=0 bash "$repo_root/scripts/package.sh" >/dev/null
cp "$repo_root/target/releases/jarvis-token-1.0.0-rc.0.tar.gz" "$temporary_dir/first.tar.gz"
SOURCE_DATE_EPOCH=0 bash "$repo_root/scripts/package.sh" >/dev/null
cmp --silent "$temporary_dir/first.tar.gz" "$repo_root/target/releases/jarvis-token-1.0.0-rc.0.tar.gz" || {
  echo "release archive is not reproducible" >&2
  exit 1
}
echo "Release archive is byte-for-byte reproducible"
