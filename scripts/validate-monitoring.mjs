import { readFileSync, existsSync } from "node:fs";

const required = [
  "token/services/ports.ts",
  "token/services/monitoring.ts",
  "token/security/runtime-gate.ts",
  "token/database/schemas/onchain-observation.schema.json",
  "token/database/schemas/reserve-observation.schema.json",
  "apps/bridge/lib/token-monitoring/rpc-observer.ts",
  "apps/bridge/lib/token-monitoring/runtime.ts",
  "apps/bridge/app/api/v1/token/health/route.ts",
];
for (const file of required) if (!existsSync(file)) throw new Error(`Missing ${file}`);
const schema = readFileSync("prisma/schema.prisma", "utf8");
for (const model of ["TokenOnChainObservationRecord", "BridgeReserveObservationRecord"]) {
  if (!schema.includes(`model ${model}`)) throw new Error(`Missing Prisma model ${model}`);
}
const env = readFileSync(".env.example", "utf8");
for (const name of ["JARVIS_TOKEN_LIVE_MONITORING_ENABLED", "JARVIS_TOKEN_MONITORING_FAIL_CLOSED", "JARVIS_TOKEN_MONITORING_MAX_AGE_MS"]) {
  if (!env.includes(`${name}=`)) throw new Error(`Missing ${name} from .env.example`);
}
console.log("JARVIS live token monitoring validated");
