#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
echo "Running production dependency vulnerability gate"
if ! npm audit --omit=dev --audit-level=high; then
  echo "BLOCKED: high/critical production dependency advisory detected" >&2
  echo "Upgrade/migrate the dependency or obtain documented, time-limited security acceptance." >&2
  exit 2
fi
echo "Production dependency audit passed"
