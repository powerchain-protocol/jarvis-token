import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "functions/allocation.ts",
  "functions/vesting.ts",
  "functions/treasury.ts",
  "functions/circulation.ts",
  "services/tokenomics.ts",
  "config/allocation-policy.json",
  "database/schemas/allocation-plan.schema.json",
  "database/schemas/vesting-schedule.schema.json",
  "database/schemas/treasury-movement.schema.json",
  "database/schemas/allocation-claim-request.schema.json",
  "config/treasury-policy.example.json",
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);

const policy = JSON.parse(fs.readFileSync(path.join(root, "config/allocation-policy.json"),"utf8"));
if (policy.maximumSupplyBaseUnits !== "20000000000000000") throw new Error("Allocation policy supply does not match canonical JARVIS supply");
if (policy.percentageScaleBps !== 10000) throw new Error("Allocation policy must use 10000 basis points");
if (policy.allocationStatus !== "unapproved") throw new Error("Release candidate must not invent a final allocation");
if (policy.requirements.finalPercentagesPublished !== false) throw new Error("Final allocation percentages must remain unpublished until approved");

const source = fs.readFileSync(path.join(root, "functions/allocation.ts"),"utf8");
for (const needle of ["allocation-base-units-must-equal-fixed-supply","allocation-percentages-must-total-10000-bps","roundingAdjustmentBaseUnits"]) {
  if (!source.includes(needle)) throw new Error(`Allocation invariant missing: ${needle}`);
}
const claims = fs.readFileSync(path.join(root, "functions/allocation-claims.ts"),"utf8");
for (const needle of ["beneficiaryAddress", "Claim ID has already been used", "exceeds currently claimable"]) {
  if (!claims.includes(needle)) throw new Error(`Allocation claim guard missing: ${needle}`);
}
const treasury = fs.readFileSync(path.join(root, "functions/treasury.ts"),"utf8");
if (!treasury.includes("timelockSeconds")) throw new Error("Treasury timelock policy missing");
if (!treasury.includes("two independent approvals")) throw new Error("Treasury approval separation missing");

console.log("JARVIS tokenomics and treasury enforcement validated");
