import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const tokenRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const repoRoot = path.resolve(tokenRoot, "..");
const rel = (p) => path.relative(repoRoot, p).replaceAll(path.sep, "/");
const errors = [];

const required = [
  "README.md", "TOKENOMICS.md", "STRUCTURE.md", "tsconfig.json",
  "assets/jarvis-green.png", "assets/jarvis-logo-dark.png", "assets/jarvis-logo-light.png",
  "config/asset.json", "config/tokenomics.policy.json",
  "contracts/sui-mainnet/Move.toml", "contracts/sui-mainnet/sources/jarvis.move",
  "contracts/sui-testnet/Move.toml", "contracts/sui-testnet/sources/jarvis.move",
  "programs/solana/mainnet-token-2022.json", "programs/solana/testnet-token-2022.json",
  "metadata/metadata.json", "metadata/asset-manifest.json", "metadata/logo-manifest.json", "metadata/integrity-manifest.json", "metadata/sui.json", "metadata/solana.json", "metadata/security.json",
  "data/registry.json", "data/health-policy.json",
  "database/schemas/canonical-asset.schema.json", "database/schemas/deployment.schema.json", "database/schemas/metadata.schema.json", "database/schemas/representation.schema.json", "database/schemas/supply-snapshot.schema.json", "database/schemas/authority-snapshot.schema.json", "database/schemas/bridge-reserve-snapshot.schema.json", "database/schemas/token-health.schema.json", "database/schemas/token-event.schema.json",
  "common/types.ts", "constants/token.ts", "constants/version.ts", "constants/paths.ts", "context/token-context.ts", "functions/asset.ts", "functions/supply.ts", "functions/reconciliation.ts", "functions/metadata.ts",
  "security/policy.ts", "security/authorities.ts", "security/activation.ts", "storage/types.ts", "ui/token-presentation.ts", "ui/tokens.css", "utils/amounts.ts", "utils/checksums.ts", "utils/time.ts", "validation/validate.ts", "validation/metadata.ts",
];
for (const name of required) if (!fs.existsSync(path.join(tokenRoot, name))) errors.push(`missing:${name}`);

const asset = JSON.parse(fs.readFileSync(path.join(tokenRoot, "config/asset.json"), "utf8"));
const tokenomics = JSON.parse(fs.readFileSync(path.join(tokenRoot, "config/tokenomics.policy.json"), "utf8"));
const metadata = JSON.parse(fs.readFileSync(path.join(tokenRoot, "metadata/metadata.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(tokenRoot, "metadata/asset-manifest.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(tokenRoot, "data/registry.json"), "utf8"));

for (const [file, value] of [["config/asset.json", asset], ["config/tokenomics.policy.json", tokenomics], ["metadata/metadata.json", metadata]]) {
  if (value.name !== "JARVIS") errors.push(`${file}:name-must-be-JARVIS`);
  if (value.symbol !== "JARVIS") errors.push(`${file}:symbol-must-be-JARVIS`);
}
if (asset.canonicalChain !== "sui" || tokenomics.canonicalChain !== "sui" || registry.canonicalChain !== "sui") errors.push("canonical-chain-must-be-sui");
if (asset.decimals !== 6 || tokenomics.decimals !== 6 || metadata.decimals !== 6) errors.push("decimals-must-be-6");
if (tokenomics.maximumWholeSupply !== "18440000000" || tokenomics.maximumBaseUnits !== "18440000000000000") errors.push("tokenomics-supply-drift");
if (metadata.supply.wholeTokens !== "18440000000" || metadata.supply.baseUnits !== "18440000000000000") errors.push("metadata-supply-drift");
const canonical = asset.representations.filter((x) => x.type === "canonical");
const bridged = asset.representations.filter((x) => x.type === "bridged");
if (canonical.length !== 1 || canonical[0]?.chain !== "sui") errors.push("canonical-representation-invalid");
if (bridged.length !== 1 || bridged[0]?.chain !== "solana" || bridged[0]?.provider !== "wormhole") errors.push("bridged-representation-invalid");
if (asset.bridgeSupport?.provider !== "wormhole" || asset.bridgeSupport?.protocol !== "ntt" || asset.bridgeSupport?.exactOneToOne !== true) errors.push("asset-bridge-support-invalid");
if ((asset.bridgeSupport?.routes ?? []).join("|") !== "jarvis:sui:solana:wormhole-ntt|jarvis:solana:sui:wormhole-ntt") errors.push("asset-route-set-invalid");
if (tokenomics.solanaRepresentation !== "bridged") errors.push("tokenomics-solana-representation-invalid");
if (metadata.properties.solanaRepresentationType !== "bridged") errors.push("metadata-solana-representation-invalid");
if (metadata.deployment.verified !== false && (!metadata.deployment.suiCoinType || !metadata.deployment.solanaMint)) errors.push("metadata-false-positive-deployment");
if (registry.schemaVersion !== 4) errors.push("registry-schema-version-must-be-4");
if (!/^[0-9a-f]{64}$/.test(registry.commitmentSha256 ?? "")) errors.push("registry-commitment-invalid");
if (registry.supply?.baseUnits !== "18440000000000000") errors.push("registry-supply-drift");

for (const entry of manifest.files) {
  const file = path.join(tokenRoot, "assets", path.basename(entry.uri));
  if (!fs.existsSync(file)) { errors.push(`asset-manifest-missing:${entry.uri}`); continue; }
  const digest = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (digest !== entry.sha256) errors.push(`asset-manifest-digest-drift:${entry.uri}`);
}

const integrityManifest = JSON.parse(fs.readFileSync(path.join(tokenRoot, "metadata/integrity-manifest.json"), "utf8"));
if (integrityManifest.schemaVersion !== 1 || !/^[0-9a-f]{64}$/.test(integrityManifest.commitmentSha256 ?? "")) errors.push("integrity-manifest-invalid");

const logoManifest = JSON.parse(fs.readFileSync(path.join(tokenRoot, "metadata/logo-manifest.json"), "utf8"));
if (logoManifest.schemaVersion !== 2) errors.push("logo-manifest-schema-version-must-be-2");
if (manifest.schemaVersion !== 2) errors.push("asset-manifest-schema-version-must-be-2");
if (asset.schemaVersion !== 3) errors.push("asset-config-schema-version-must-be-3");
if (tokenomics.schemaVersion !== 3) errors.push("tokenomics-schema-version-must-be-3");

for (const size of logoManifest.generatedSizes ?? []) {
  for (const variant of ["canonical", "dark", "light"]) {
    for (const format of logoManifest.generatedFormats ?? ["png"]) {
      const generated = path.join(tokenRoot, "assets/generated", `jarvis-${variant}-${size}.${format}`);
      if (!fs.existsSync(generated)) errors.push(`generated-logo-missing:${variant}:${size}:${format}`);
    }
  }
}

const textRoots = ["token", "packages/token-core", "bridge/wormhole", "tests"];
const forbidden = ["Wrapped JARVIS", "wrapped-sui-jarvis", "sui-jarvis-to-solana-wrapped-jarvis", 'solanaRole: "wrapped"'];
for (const rootName of textRoots) {
  const root = path.join(repoRoot, rootName); if (!fs.existsSync(root)) continue;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop(); const stat = fs.statSync(current);
    if (stat.isDirectory()) { for (const item of fs.readdirSync(current)) stack.push(path.join(current, item)); continue; }
    if (!/\.(?:ts|tsx|js|mjs|json|md|move)$/.test(current)) continue;
    if (current.endsWith("token/scripts/validate-token.mjs")) continue;
    const text = fs.readFileSync(current, "utf8");
    for (const phrase of forbidden) if (text.includes(phrase)) errors.push(`${rel(current)}:forbidden:${phrase}`);
  }
}

if (errors.length) {
  console.error("JARVIS token validation failed:\n- " + [...new Set(errors)].join("\n- "));
  process.exit(1);
}
console.log("JARVIS token validation passed");
