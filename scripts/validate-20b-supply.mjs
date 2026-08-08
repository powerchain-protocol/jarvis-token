import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const WHOLE = 20_000_000_000n;
const SCALE = 1_000_000n;
const BASE = 20_000_000_000_000_000n;
const U64_MAX = (1n << 64n) - 1n;
if (WHOLE * SCALE !== BASE) throw new Error("20B JARVIS decimal/base-unit invariant failed");
if (BASE > U64_MAX) throw new Error("20B JARVIS exceeds Sui u64 accounting capacity");

const checks = new Map([
  ["constants/token.ts", ["maximumWholeSupply: 20_000_000_000n", "maximumBaseUnits: 20_000_000_000_000_000n"]],
  ["contracts/jarvis_token/sources/jarvis.move", ["const DECIMALS: u8 = 6", "const MAXIMUM_WHOLE_SUPPLY: u64 = 20_000_000_000", "const MAXIMUM_BASE_UNITS: u64 = 20_000_000_000_000_000", "coin::total_supply(&treasury_cap) == MAXIMUM_BASE_UNITS", "public struct BurnAuthority has key"]],
  ["config/tokenomics.policy.json", ['"maximumWholeSupply": "20000000000"', '"maximumBaseUnits": "20000000000000000"']],
  ["config/allocation-policy.json", ['"maximumSupplyBaseUnits": "20000000000000000"']],
  ["metadata/metadata.json", ['"wholeTokens": "20000000000"', '"baseUnits": "20000000000000000"']],
  ["data/registry.json", ['"wholeTokens": "20000000000"', '"baseUnits": "20000000000000000"']],
]);
for (const [rel, needles] of checks) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing supply-protected file: ${rel}`);
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) if (!text.includes(needle)) throw new Error(`${rel} missing invariant: ${needle}`);
}

const stale = ["18440000000000000", "18_440_000_000_000_000", "18,440,000,000,000,000", "18440000000", "18_440_000_000", "18,440,000,000", "18.44B", "18.44 billion"];
const allowedSelf = path.join(root, "scripts", "validate-20b-supply.mjs");
for (const base of ["constants", "config", "contracts", "database", "metadata", "data", "functions", "services", "security", "storage", "tests", "docs", "README.md", "TOKENOMICS.md"]) {
  const start = path.join(root, base); if (!fs.existsSync(start)) continue;
  const stack = [start];
  while (stack.length) {
    const current = stack.pop(); const stat = fs.statSync(current);
    if (stat.isDirectory()) { for (const name of fs.readdirSync(current)) stack.push(path.join(current, name)); continue; }
    if (current === allowedSelf || !/\.(?:ts|tsx|js|mjs|json|md|move|toml)$/.test(current)) continue;
    const text = fs.readFileSync(current, "utf8");
    for (const old of stale) if (text.includes(old)) throw new Error(`Legacy 18.44B supply reference remains in ${path.relative(root,current)}: ${old}`);
  }
}
console.log(`20B supply validation passed: ${BASE} base units < u64::MAX (${U64_MAX})`);
