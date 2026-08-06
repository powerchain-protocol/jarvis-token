#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <solana-mainnet-config.json> <ntt-mainnet-config.json>" >&2
  exit 64
fi
solana_config="$1"
bridge_config="$2"

required=(node npm rg sha256sum)
for command_name in "${required[@]}"; do
  command -v "$command_name" >/dev/null || { echo "missing required command: $command_name" >&2; exit 1; }
done

[[ -f package-lock.json ]] || { echo "package-lock.json is required" >&2; exit 1; }
[[ -f "$solana_config" ]] || { echo "missing Solana config: $solana_config" >&2; exit 1; }
[[ -f "$bridge_config" ]] || { echo "missing bridge config: $bridge_config" >&2; exit 1; }

npm run build
node dist/packages/token-core/src/cli.js validate-production-config --solana "$solana_config" --bridge "$bridge_config"

bash scripts/check.sh
bash scripts/security-audit.sh
bash scripts/reproducibility-check.sh
bash scripts/verify-release.sh target/releases/jarvis-token-1.0.0-rc.0.tar.gz target/releases/SHA256SUMS

if ! command -v sui >/dev/null 2>&1; then
  echo "BLOCKED: install the pinned Sui CLI and rerun; Move compilation is mandatory for production" >&2
  exit 2
fi

echo "Automated readiness checks passed. Audit, simulation, multisig, evidence, and approvals remain mandatory."
