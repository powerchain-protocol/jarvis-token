import fs from "node:fs";
const must = [
  "token/config/deployments/testnet.json", "token/config/deployments/mainnet.json",
  "token/database/schemas/deployment-profile.schema.json", "token/constants/monetary.ts",
  "token/functions/supply.ts", "token/functions/deployment.ts",
];
for (const f of must) if (!fs.existsSync(f)) throw new Error(`Missing ${f}`);
const supply = fs.readFileSync("token/functions/supply.ts","utf8");
if (!supply.includes("bridgedSolanaBaseUnits + pendingForward + pendingReverse")) throw new Error("Reverse bridge liability sign regression");
const deploy = fs.readFileSync("token/functions/deployment.ts","utf8");
for (const n of ["canonicalSuiDeploymentReadiness","bridgedSolanaDeploymentReadiness","tokenRuntimeReadiness"]) if (!deploy.includes(n)) throw new Error(`Missing ${n}`);
const main = fs.readFileSync("token/contracts/sui-mainnet/sources/jarvis.move","utf8");
const test = fs.readFileSync("token/contracts/sui-testnet/sources/jarvis.move","utf8");
if (main !== test) throw new Error("Sui Mainnet/Testnet canonical source drift");
for (const n of ["18_440_000_000","18_440_000_000_000_000","treasury_into_supply","is_canonical_fixed_supply","GenesisReceipt","is_canonical_genesis"]) if (!main.includes(n)) throw new Error(`Sui source invariant missing: ${n}`);
for (const e of ["testnet","mainnet"]) { const p=JSON.parse(fs.readFileSync(`token/config/deployments/${e}.json`,"utf8")); if (p.bridge.enabled !== false || p.sui.verified !== false || p.solana.verified !== false) throw new Error(`${e} deployment profile must fail closed`); }
console.log("JARVIS token upgrade validation passed: fixed supply, canonical Sui evidence, bridged Solana evidence, corrected reserve accounting, and fail-closed deployment profiles.");
