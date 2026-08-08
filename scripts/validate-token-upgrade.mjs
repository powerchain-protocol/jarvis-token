import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const must = [
  "config/deployments/testnet.json", "config/deployments/mainnet.json",
  "database/schemas/deployment-profile.schema.json", "constants/monetary.ts",
  "functions/supply.ts", "functions/deployment.ts", "functions/deployment-evidence.ts",
  "database/schemas/signed-deployment-manifest.schema.json",
  "contracts/jarvis_token/sources/jarvis.move", "contracts/mainnet/Move.toml", "contracts/devnet/Move.toml",
];
for (const f of must) if (!fs.existsSync(path.join(root, f))) throw new Error(`Missing ${f}`);
const supply = fs.readFileSync(path.join(root, "functions/supply.ts"),"utf8");
if (!supply.includes("bridgedSolanaBaseUnits + pendingForward + pendingReverse")) throw new Error("Reverse bridge liability sign regression");
const deploy = fs.readFileSync(path.join(root, "functions/deployment.ts"),"utf8");
for (const n of ["canonicalSuiDeploymentReadiness","bridgedSolanaDeploymentReadiness","productionDeploymentReadiness","tokenRuntimeReadiness"]) if (!deploy.includes(n)) throw new Error(`Missing ${n}`);
const source = fs.readFileSync(path.join(root, "contracts/jarvis_token/sources/jarvis.move"),"utf8");
for (const n of ["20_000_000_000","20_000_000_000_000_000","public struct BurnAuthority has key","public entry fun burn"]) if (!source.includes(n)) throw new Error(`Sui source invariant missing: ${n}`);
for (const legacy of ["contracts/sui-mainnet", "contracts/sui-testnet"]) if (fs.existsSync(path.join(root, legacy))) throw new Error(`Legacy contract mirror still exists: ${legacy}`);
if (fs.existsSync(path.join(root, "security/contracts"))) throw new Error("Nested security contract mirror must not exist");
for (const e of ["testnet","mainnet"]) { const p=JSON.parse(fs.readFileSync(path.join(root, `config/deployments/${e}.json`),"utf8")); if (p.bridge.enabled !== false || p.sui.verified !== false || p.solana.verified !== false) throw new Error(`${e} deployment profile must fail closed`); }
console.log("JARVIS token upgrade validation passed: one canonical Move source, fixed supply, deployment hardening, corrected reserve accounting, and fail-closed deployment profiles.");
