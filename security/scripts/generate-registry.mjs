import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, normalize(v)]));
  return value;
}
const asset = read("config/asset.json");
const tokenomics = read("config/tokenomics.policy.json");
const metadata = read("metadata/metadata.json");
const payload = {
  schemaVersion: 4,
  asset: asset.id,
  canonicalChain: asset.canonicalChain,
  decimals: asset.decimals,
  representations: asset.representations,
  bridgeSupport: asset.bridgeSupport,
  routes: ["jarvis:sui:solana:wormhole-ntt", "jarvis:solana:sui:wormhole-ntt"],
  supply: { wholeTokens: tokenomics.maximumWholeSupply, baseUnits: tokenomics.maximumBaseUnits, model: tokenomics.monetaryModel },
  metadata: { source: "../metadata/metadata.json", image: metadata.image },
  sources: { asset: "../config/asset.json", tokenomics: "../config/tokenomics.policy.json", metadata: "../metadata/metadata.json" }
};
const commitmentSha256 = createHash("sha256").update(JSON.stringify(normalize(payload))).digest("hex");
fs.writeFileSync(path.join(root, "data/registry.json"), `${JSON.stringify({ ...payload, commitmentSha256 }, null, 2)}\n`);
console.log(`Generated token/data/registry.json (${commitmentSha256})`);
