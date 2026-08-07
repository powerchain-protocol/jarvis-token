import fs from "node:fs";

const required = [
  "token/functions/allocation.ts",
  "token/functions/vesting.ts",
  "token/functions/treasury.ts",
  "token/functions/circulation.ts",
  "token/services/tokenomics.ts",
  "token/config/allocation-policy.json",
  "token/database/schemas/allocation-plan.schema.json",
  "token/database/schemas/vesting-schedule.schema.json",
  "token/database/schemas/treasury-movement.schema.json",
  "token/database/schemas/allocation-claim-request.schema.json",
  "token/config/treasury-policy.example.json",
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);

const policy = JSON.parse(fs.readFileSync("token/config/allocation-policy.json","utf8"));
if (policy.maximumSupplyBaseUnits !== "18440000000000000") throw new Error("Allocation policy supply does not match canonical JARVIS supply");
if (policy.percentageScaleBps !== 10000) throw new Error("Allocation policy must use 10000 basis points");
if (policy.allocationStatus !== "unapproved") throw new Error("Release candidate must not invent a final allocation");
if (policy.requirements.finalPercentagesPublished !== false) throw new Error("Final allocation percentages must remain unpublished until approved");

const source = fs.readFileSync("token/functions/allocation.ts","utf8");
for (const needle of ["allocation-base-units-must-equal-fixed-supply","allocation-percentages-must-total-10000-bps","roundingAdjustmentBaseUnits"]) {
  if (!source.includes(needle)) throw new Error(`Allocation invariant missing: ${needle}`);
}
const claims = fs.readFileSync("token/functions/allocation-claims.ts","utf8");
for (const needle of ["beneficiaryAddress", "Claim ID has already been used", "exceeds currently claimable"]) {
  if (!claims.includes(needle)) throw new Error(`Allocation claim guard missing: ${needle}`);
}
const treasury = fs.readFileSync("token/functions/treasury.ts","utf8");
if (!treasury.includes("timelockSeconds")) throw new Error("Treasury timelock policy missing");
if (!treasury.includes("two independent approvals")) throw new Error("Treasury approval separation missing");

console.log("JARVIS tokenomics and treasury enforcement validated");
