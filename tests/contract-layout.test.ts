import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function findJarvisSources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findJarvisSources(absolute));
    else if (entry.name === "jarvis.move") found.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
  }
  return found;
}

test("JARVIS Move contract has exactly one authoritative source", () => {
  assert.deepEqual(findJarvisSources(path.join(root, "contracts")), ["contracts/jarvis_token/sources/jarvis.move"]);
});

test("Mainnet and Devnet profiles are rc.1 manifests without source mirrors", () => {
  const mainnet = fs.readFileSync(path.join(root, "contracts/mainnet/Move.toml"), "utf8");
  const devnet = fs.readFileSync(path.join(root, "contracts/devnet/Move.toml"), "utf8");
  assert.match(mainnet, /version = "1\.0\.0-rc\.1"/);
  assert.match(mainnet, /rev = "mainnet"/);
  assert.match(devnet, /version = "1\.0\.0-rc\.1"/);
  assert.match(devnet, /rev = "devnet"/);
  assert.equal(fs.existsSync(path.join(root, "contracts/mainnet/sources")), false);
  assert.equal(fs.existsSync(path.join(root, "contracts/devnet/sources")), false);
});

test("canonical Move source preserves immutable economic finalization invariants", () => {
  const source = fs.readFileSync(path.join(root, "contracts/jarvis_token/sources/jarvis.move"), "utf8");
  for (const invariant of [
    "const DECIMALS: u8 = 6",
    "const MAXIMUM_WHOLE_SUPPLY: u64 = 20_000_000_000",
    "const MAXIMUM_BASE_UNITS: u64 = 20_000_000_000_000_000",
    "public struct BurnAuthority has key",
    "transfer::public_freeze_object(metadata)",
    "const MAX_BURN_BPS_PER_WINDOW: u64 = 200",
    "public entry fun burn",
  ]) assert.ok(source.includes(invariant), `missing invariant: ${invariant}`);
});
