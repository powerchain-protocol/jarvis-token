import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const schemaDir = path.join(root, "database", "schemas");
const errors = [];
for (const name of fs.readdirSync(schemaDir).filter((x) => x.endsWith(".schema.json")).sort()) {
  const file = path.join(schemaDir, name);
  let schema;
  try { schema = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { errors.push(`${name}:invalid-json:${error.message}`); continue; }
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") errors.push(`${name}:wrong-draft`);
  if (!schema.$id?.startsWith("https://jarvis.ai/schemas/token/")) errors.push(`${name}:missing-canonical-id`);
  if (schema.type !== "object") errors.push(`${name}:root-type-must-be-object`);
  if (schema.additionalProperties !== false) errors.push(`${name}:additionalProperties-must-be-false`);
}
if (errors.length) { console.error(`JARVIS token schema validation failed:\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log("JARVIS token database schemas validated");
