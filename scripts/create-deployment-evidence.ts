import fs from "node:fs";
import path from "node:path";
import { createSignedDeploymentEvidence, type CanonicalDeploymentManifest, type DeploymentSignatureEvidence } from "../functions/deployment-evidence.ts";

const [, , manifestArg, outputArg, signaturesArg] = process.argv;
if (!manifestArg || !outputArg) {
  console.error("Usage: node --experimental-strip-types scripts/create-deployment-evidence.ts <manifest.json> <evidence.json> [signatures.json]");
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestArg), "utf8")) as CanonicalDeploymentManifest;
const signatures = signaturesArg
  ? JSON.parse(fs.readFileSync(path.resolve(signaturesArg), "utf8")) as DeploymentSignatureEvidence[]
  : [];
const evidence = await createSignedDeploymentEvidence(manifest, signatures);
fs.writeFileSync(path.resolve(outputArg), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote deployment evidence ${outputArg}`);
console.log(`SHA-256 ${evidence.commitment.value}`);
if (signatures.length === 0) console.warn("No signatures supplied: evidence is committed but not release-signable.");
