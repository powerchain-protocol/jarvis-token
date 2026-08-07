import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const includedRoots = ["config", "metadata", "data", "database/schemas", "contracts", "programs"];
const allowed = /\.(?:json|move|toml|md)$/;
const rows = [];
for (const base of includedRoots) {
  const absolute = path.join(root, base);
  if (!fs.existsSync(absolute)) continue;
  const stack = [absolute];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) { for (const name of fs.readdirSync(current).sort().reverse()) stack.push(path.join(current, name)); continue; }
    if (!allowed.test(current) || current.endsWith("integrity-manifest.json")) continue;
    const buffer = fs.readFileSync(current);
    rows.push({ path: path.relative(root, current).replaceAll(path.sep, "/"), bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") });
  }
}
rows.sort((a, b) => a.path.localeCompare(b.path));
const commitmentSha256 = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
const output = { schemaVersion: 1, asset: "jarvis", algorithm: "sha256", generatedAtPolicy: "deterministic-no-timestamp", files: rows, commitmentSha256 };
fs.writeFileSync(path.join(root, "metadata", "integrity-manifest.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated token integrity manifest (${rows.length} files, ${commitmentSha256})`);
