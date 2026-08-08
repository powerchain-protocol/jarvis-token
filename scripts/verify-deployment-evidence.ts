import fs from "node:fs";
import path from "node:path";
import { verifySignedDeploymentEvidence, type SignedDeploymentEvidence } from "../functions/deployment-evidence.ts";

const [, , evidenceArg] = process.argv;
if (!evidenceArg) {
  console.error("Usage: node --experimental-strip-types scripts/verify-deployment-evidence.ts <evidence.json>");
  process.exit(2);
}
const evidence = JSON.parse(fs.readFileSync(path.resolve(evidenceArg), "utf8")) as SignedDeploymentEvidence;
const result = await verifySignedDeploymentEvidence(evidence, { requireSignatures: 1 });
if (!result.valid) {
  console.error(`Deployment evidence verification failed:\n- ${result.issues.join("\n- ")}`);
  process.exit(1);
}
console.log(`Deployment evidence commitment verified: ${evidence.commitment.value}`);
console.log(`Signer evidence records: ${evidence.signatures.length}`);
console.log("Cryptographic signature verification remains an explicit external/release verifier responsibility.");
