#!/usr/bin/env bash
set -euo pipefail

NETWORK="${1:-testnet}"
PACKAGE_DIR="${2:-contracts/mainnet}"
OUT_DIR="${JARVIS_DEPLOYMENT_OUT_DIR:-target/publish/${NETWORK}}"
mkdir -p "$OUT_DIR"

case "$NETWORK" in mainnet|testnet|devnet) ;; *) echo "Unsupported network: $NETWORK" >&2; exit 2;; esac
command -v sui >/dev/null || { echo "sui CLI is required" >&2; exit 127; }

sui client active-env > "$OUT_DIR/active-env.txt"
sui move build --path "$PACKAGE_DIR"

if [[ "${JARVIS_ALLOW_PUBLISH:-false}" != "true" ]]; then
  echo "Build complete. Publishing is fail-closed; set JARVIS_ALLOW_PUBLISH=true only after review."
  exit 0
fi

sui client publish "$PACKAGE_DIR" --gas-budget "${JARVIS_PUBLISH_GAS_BUDGET:?set JARVIS_PUBLISH_GAS_BUDGET}" --json > "$OUT_DIR/publish.json"
node --input-type=module - "$OUT_DIR/publish.json" "$OUT_DIR/deployment.env" <<'NODE'
import fs from 'node:fs';
const [input, output] = process.argv.slice(2);
const tx = JSON.parse(fs.readFileSync(input, 'utf8'));
const created = tx.objectChanges?.filter((x) => x.type === 'created') ?? [];
const published = tx.objectChanges?.find((x) => x.type === 'published');
const packageId = published?.packageId ?? '';
const upgradeCap = created.find((x) => String(x.objectType ?? '').includes('UpgradeCap'))?.objectId ?? '';
fs.writeFileSync(output, `JARVIS_PACKAGE_ID=${packageId}\nJARVIS_UPGRADE_CAP_ID=${upgradeCap}\nJARVIS_PUBLISH_DIGEST=${tx.digest ?? ''}\n`);
NODE

echo "Publish evidence written to $OUT_DIR. Verify every identifier before enabling sale or bridge."
