import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifestPath = path.join(root, "metadata", "integrity-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = [];
const rows = [];
for (const entry of manifest.files ?? []) {
  const file = path.resolve(root, entry.path);
  if (!file.startsWith(root + path.sep)) { errors.push(`unsafe:${entry.path}`); continue; }
  if (!fs.existsSync(file)) { errors.push(`missing:${entry.path}`); continue; }
  const buffer = fs.readFileSync(file);
  const digest = createHash("sha256").update(buffer).digest("hex");
  if (digest !== entry.sha256) errors.push(`digest:${entry.path}`);
  if (buffer.length !== entry.bytes) errors.push(`size:${entry.path}`);
  rows.push({ path: entry.path, bytes: buffer.length, sha256: digest });
}
rows.sort((a,b)=>a.path.localeCompare(b.path));
const commitment = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
if (commitment !== manifest.commitmentSha256) errors.push("commitment");
if (errors.length) { console.error(`JARVIS token integrity verification failed:\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`JARVIS token integrity verified (${rows.length} files)`);
