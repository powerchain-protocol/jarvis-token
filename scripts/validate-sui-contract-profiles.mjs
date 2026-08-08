import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "contracts/jarvis_token/sources/jarvis.move");
const mainnetToml = fs.readFileSync(path.join(root, "contracts/mainnet/Move.toml"), "utf8");
const devnetToml = fs.readFileSync(path.join(root, "contracts/devnet/Move.toml"), "utf8");
const source = fs.readFileSync(sourcePath);

if (!mainnetToml.includes('version = "1.0.0-rc.1"')) throw new Error("Mainnet Move profile release mismatch");
if (!devnetToml.includes('version = "1.0.0-rc.1"')) throw new Error("Devnet Move profile release mismatch");
if (!mainnetToml.includes('rev = "mainnet"')) throw new Error("Canonical Sui profile must target mainnet");
if (!devnetToml.includes('rev = "devnet"')) throw new Error("Devnet Sui profile must target devnet");
for (const legacy of ["contracts/sui-mainnet", "contracts/sui-testnet"]) {
  if (fs.existsSync(path.join(root, legacy))) throw new Error(`Legacy duplicated contract tree must not exist: ${legacy}`);
}
const moveSources = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.name === "jarvis.move") moveSources.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
  }
};
walk(path.join(root, "contracts"));
if (moveSources.length !== 1 || moveSources[0] !== "contracts/jarvis_token/sources/jarvis.move") {
  throw new Error(`Exactly one canonical JARVIS Move source is allowed; found ${moveSources.join(", ")}`);
}
const text = source.toString("utf8");
for (const needle of ["const DECIMALS: u8 = 6", "20_000_000_000_000_000", "public struct BurnAuthority has key", "MAX_BURN_BPS_PER_WINDOW: u64 = 200", "public entry fun burn"]) {
  if (!text.includes(needle)) throw new Error(`Canonical JARVIS source invariant missing: ${needle}`);
}
console.log(`Sui token profiles validated: one canonical source, sha256=${crypto.createHash("sha256").update(source).digest("hex")}`);
