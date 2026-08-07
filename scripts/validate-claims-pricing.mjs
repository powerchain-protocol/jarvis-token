import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "functions/claim.ts",
  "functions/calculations.ts",
  "functions/rates.ts",
  "functions/price.ts",
  "functions/quote.ts",
  "services/claim.ts",
  "services/pricing.ts",
  "database/schemas/claim.schema.json",
  "database/schemas/rate-quote.schema.json",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

const pricing = fs.readFileSync(path.join(root, "functions/price.ts"), "utf8");
if (pricing.includes("fallbackPrice") || pricing.includes("initialPrice")) throw new Error("Token price resolution must not fabricate market prices");

const claimService = fs.readFileSync(path.join(root, "services/claim.ts"), "utf8");
for (const needle of ["attestation.routeId !== claim.routeId", "attestation.amountBaseUnits !== claim.amountBaseUnits", "attestation.recipient !== claim.recipient", "attempt limit reached"]) {
  if (!claimService.includes(needle)) throw new Error(`Claim binding invariant missing: ${needle}`);
}

// Platform-level replay protection (Sui redeemed-message table, Solana receipt
// PDA, Prisma uniqueness) is validated by the Bridge domain at the platform
// root, outside this token repository.

console.log("JARVIS claim, calculations, rates, and pricing validation passed");
