import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = process.argv[2];
if (!new Set(["mainnet", "devnet"]).has(profile)) {
  throw new Error("Usage: node scripts/prepare-sui-contract-profile.mjs <mainnet|devnet>");
}

const canonicalSource = path.join(root, "contracts/jarvis_token/sources/jarvis.move");
const profileToml = path.join(root, `contracts/${profile}/Move.toml`);
for (const file of [canonicalSource, profileToml]) {
  if (!fs.existsSync(file)) throw new Error(`Missing required contract input: ${path.relative(root, file)}`);
}

const output = path.join(root, ".build", "sui", profile);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, "sources"), { recursive: true });
fs.copyFileSync(profileToml, path.join(output, "Move.toml"));
fs.copyFileSync(canonicalSource, path.join(output, "sources", "jarvis.move"));
fs.writeFileSync(path.join(output, "SOURCE"), "contracts/jarvis_token/sources/jarvis.move\n");
console.log(`Prepared ${profile} Sui package at ${path.relative(root, output)}`);
