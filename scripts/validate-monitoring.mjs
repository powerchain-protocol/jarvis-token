import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "services/ports.ts",
  "services/monitoring.ts",
  "security/runtime-gate.ts",
  "database/schemas/onchain-observation.schema.json",
  "database/schemas/reserve-observation.schema.json",
];
for (const file of required) if (!existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);

// The runtime gate must fail closed: transfers are blocked when monitoring is
// unavailable, paused, or unhealthy, and only allowed with zero reasons.
const gate = readFileSync(path.join(root, "security/runtime-gate.ts"), "utf8");
for (const needle of ['"monitoring-unavailable"', "allowed: reasons.length === 0"]) {
  if (!gate.includes(needle)) throw new Error(`Runtime gate invariant missing: ${needle}`);
}

// Platform RPC observers, health routes, Prisma models, and .env.example
// settings live at the platform root and are validated outside this token
// repository.

console.log("JARVIS live token monitoring validated");
