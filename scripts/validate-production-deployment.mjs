import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "functions/deployment-evidence.ts",
  "database/schemas/signed-deployment-manifest.schema.json",
  "scripts/create-deployment-evidence.ts",
  "scripts/verify-deployment-evidence.ts",
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
const deployment = fs.readFileSync(path.join(root, "functions/deployment-evidence.ts"), "utf8");
for (const invariant of [
  "fixedSupplyBaseUnits",
  "canonicalMintingAfterGenesis",
  "exactOneToOne",
  "bridgeProgramId",
  "nttManagerProgramId",
  "mintAuthority",
  "jarvis-canonical-json-v1",
  "deployment manifest commitment mismatch",
  "paired signer and signature",
]) if (!deployment.includes(invariant)) throw new Error(`Production deployment hardening missing: ${invariant}`);
const mainnet = JSON.parse(fs.readFileSync(path.join(root, "config/deployments/mainnet.json"), "utf8"));
if (mainnet.schemaVersion !== 2) throw new Error("Mainnet deployment profile must use schemaVersion 2");
if (mainnet.bridge?.exactOneToOne !== true || mainnet.bridge?.protocol !== "ntt" || mainnet.bridge?.provider !== "wormhole") throw new Error("Bridge economics/provider invariant drift");
if (mainnet.sui?.verified !== false || mainnet.solana?.verified !== false || mainnet.bridge?.enabled !== false) throw new Error("Checked-in Mainnet deployment profile must fail closed");
if (mainnet.solana?.bridgeProgramId !== null) throw new Error("Unverified Solana bridge program must remain null");
console.log("JARVIS production deployment hardening validation passed.");
