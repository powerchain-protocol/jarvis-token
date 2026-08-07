#!/usr/bin/env bash
set -euo pipefail
TOKEN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$TOKEN_ROOT/.." && pwd)"

sync_dir() {
  local dest="$1"
  mkdir -p "$dest"
  install -m 0644 "$TOKEN_ROOT/assets/jarvis-green.png" "$dest/jarvis-green.png"
  install -m 0644 "$TOKEN_ROOT/assets/jarvis-logo-dark.png" "$dest/jarvis-dark.png"
  install -m 0644 "$TOKEN_ROOT/assets/jarvis-logo-light.png" "$dest/jarvis-light.png"
  if [ -d "$TOKEN_ROOT/assets/generated" ]; then
    mkdir -p "$dest/generated"
    find "$TOKEN_ROOT/assets/generated" -maxdepth 1 -type f \( -name '*.png' -o -name '*.webp' \) -exec install -m 0644 {} "$dest/generated/" \;
  fi
}

# Root runtime asset names retain canonical source basenames for compatibility.
mkdir -p "$REPO_ROOT/public/assets"
install -m 0644 "$TOKEN_ROOT/assets/jarvis-green.png" "$REPO_ROOT/public/assets/jarvis-green.png"
install -m 0644 "$TOKEN_ROOT/assets/jarvis-logo-dark.png" "$REPO_ROOT/public/assets/jarvis-logo-dark.png"
install -m 0644 "$TOKEN_ROOT/assets/jarvis-logo-light.png" "$REPO_ROOT/public/assets/jarvis-logo-light.png"
mkdir -p "$REPO_ROOT/public/assets/generated"
find "$TOKEN_ROOT/assets/generated" -maxdepth 1 -type f \( -name '*.png' -o -name '*.webp' \) -exec install -m 0644 {} "$REPO_ROOT/public/assets/generated/" \;

sync_dir "$REPO_ROOT/apps/bridge/public/tokens"
sync_dir "$REPO_ROOT/apps/web/public/tokens"
mkdir -p "$REPO_ROOT/apps/web/public/brand"
install -m 0644 "$TOKEN_ROOT/assets/jarvis-logo-dark.png" "$REPO_ROOT/apps/web/public/brand/jarvis-logo-dark.png"
install -m 0644 "$TOKEN_ROOT/assets/jarvis-logo-light.png" "$REPO_ROOT/apps/web/public/brand/jarvis-logo-light.png"

printf '%s\n' "Synchronized canonical JARVIS artwork to root, Bridge, and Web runtime assets"
