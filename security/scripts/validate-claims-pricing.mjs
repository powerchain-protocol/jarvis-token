import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "token/functions/claim.ts",
  "token/functions/calculations.ts",
  "token/functions/rates.ts",
  "token/functions/price.ts",
  "token/functions/quote.ts",
  "token/services/claim.ts",
  "token/services/pricing.ts",
  "token/database/schemas/claim.schema.json",
  "token/database/schemas/rate-quote.schema.json",
  "apps/bridge/app/api/v1/bridge/claims/validate/route.ts",
  "apps/bridge/app/api/v1/token/price/route.ts",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

const move = fs.readFileSync(path.join(root, "contracts/jarvis_bridge/sources/vault.move"), "utf8");
for (const needle of ["E_ALREADY_REDEEMED", "table::contains(&bridge.redeemed", "public fun is_redeemed"]) {
  if (!move.includes(needle)) throw new Error(`Sui claim replay protection missing: ${needle}`);
}

const rust = fs.readFileSync(path.join(root, "programs/solana-jarvis-bridge/src/lib.rs"), "utf8");
for (const needle of ["RedeemInbound", "message_hash", "receipt", "RecipientMismatch"]) {
  if (!rust.includes(needle)) throw new Error(`Solana claim invariant missing: ${needle}`);
}

const pricing = fs.readFileSync(path.join(root, "token/functions/price.ts"), "utf8");
if (pricing.includes("fallbackPrice") || pricing.includes("initialPrice")) throw new Error("Token price resolution must not fabricate market prices");

console.log("JARVIS claim, calculations, rates, and pricing validation passed");

const claimService = fs.readFileSync(path.join(root, "token/services/claim.ts"), "utf8");
for (const needle of ["attestation.routeId !== claim.routeId", "attestation.amountBaseUnits !== claim.amountBaseUnits", "attestation.recipient !== claim.recipient", "attempt limit reached"]) {
  if (!claimService.includes(needle)) throw new Error(`Claim binding invariant missing: ${needle}`);
}
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (!schema.includes("@@unique([transferId, destinationChain])")) throw new Error("Claim transfer/destination uniqueness missing");
