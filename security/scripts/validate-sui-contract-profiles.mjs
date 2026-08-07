import fs from "node:fs";
import crypto from "node:crypto";

const mainnetToml = fs.readFileSync("token/contracts/sui-mainnet/Move.toml", "utf8");
const testnetToml = fs.readFileSync("token/contracts/sui-testnet/Move.toml", "utf8");
const mainnetSource = fs.readFileSync("token/contracts/sui-mainnet/sources/jarvis.move");
const testnetSource = fs.readFileSync("token/contracts/sui-testnet/sources/jarvis.move");
const bridgeReadme = fs.readFileSync("contracts/jarvis_bridge/README.md", "utf8");

if (!mainnetToml.includes('rev = "mainnet"')) throw new Error("Canonical Sui profile must target the Sui mainnet revision");
if (!testnetToml.includes('rev = "framework/testnet"')) throw new Error("Testnet Sui profile must target framework/testnet");
if (!mainnetSource.equals(testnetSource)) throw new Error("Mainnet/Testnet JARVIS Move sources have drifted");
const source = mainnetSource.toString("utf8");
for (const needle of ["const DECIMALS: u8 = 6", "18_440_000_000_000_000", "treasury_into_supply", "public_freeze_object(fixed_supply)", "public struct GenesisReceipt", "public_freeze_object(genesis_receipt)", "is_canonical_genesis"]) {
  if (!source.includes(needle)) throw new Error(`Canonical JARVIS source invariant missing: ${needle}`);
}
if (!bridgeReadme.toLowerCase().includes("lock") && !bridgeReadme.toLowerCase().includes("bridge")) throw new Error("Bridge contract boundary documentation missing");
console.log(`Sui token profiles validated: ${crypto.createHash("sha256").update(mainnetSource).digest("hex")}`);
