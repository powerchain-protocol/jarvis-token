import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "metadata/asset-manifest.json"), "utf8"));
const errors = [];

function verify(entry, source) {
  const file = path.resolve(root, "metadata", entry.uri);
  if (!file.startsWith(path.resolve(root, "assets") + path.sep)) { errors.push(`unsafe-uri:${entry.uri}`); return; }
  if (!fs.existsSync(file)) { errors.push(`missing:${entry.uri}`); return; }
  const buffer = fs.readFileSync(file);
  const digest = createHash("sha256").update(buffer).digest("hex");
  if (digest !== entry.sha256) errors.push(`digest:${entry.uri}`);
  if (entry.width !== entry.height) errors.push(`non-square:${entry.uri}`);
  if (source && (entry.width < 512 || entry.height < 512)) errors.push(`resolution:${entry.uri}`);
  if (!source && ![16,32,64,128,180,192,256,512].includes(entry.width)) errors.push(`generated-size:${entry.uri}`);
}

for (const entry of manifest.files ?? []) verify(entry, true);
for (const entry of manifest.generated ?? []) verify(entry, false);
if ((manifest.files ?? []).length !== 3) errors.push("source-count");
if ((manifest.generated ?? []).length !== 48) errors.push("generated-count");

if (errors.length) {
  console.error(`JARVIS asset verification failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`JARVIS asset verification passed (${manifest.files.length} sources, ${manifest.generated.length} derivatives)`);
