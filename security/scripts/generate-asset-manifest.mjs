import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const assetsDir = path.join(root, "assets");
const sourceFiles = ["jarvis-green.png", "jarvis-logo-dark.png", "jarvis-logo-light.png"];
const generatedSizes = [16, 32, 64, 128, 180, 192, 256, 512];
const variants = ["canonical", "dark", "light"];

function sha256(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function pngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("Expected PNG source artwork");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
function sourceEntry(name) {
  const buffer = fs.readFileSync(path.join(assetsDir, name));
  return { name, uri: `../assets/${name}`, mimeType: "image/png", ...pngDimensions(buffer), sha256: sha256(buffer) };
}
function generatedEntry(name, size, format) {
  const file = path.join(assetsDir, "generated", name);
  const buffer = fs.readFileSync(file);
  return { name, uri: `../assets/generated/${name}`, mimeType: format === "png" ? "image/png" : "image/webp", width: size, height: size, sha256: sha256(buffer) };
}

const files = sourceFiles.map(sourceEntry);
const generated = [];
for (const size of generatedSizes) {
  for (const variant of variants) {
    for (const format of ["png", "webp"]) {
      const name = `jarvis-${variant}-${size}.${format}`;
      generated.push(generatedEntry(name, size, format));
    }
  }
}

const manifest = {
  schemaVersion: 2,
  asset: "jarvis",
  generatedAtPolicy: "deterministic-no-timestamp",
  sourceOfTruth: "token/assets",
  files,
  generated,
};
fs.writeFileSync(path.join(root, "metadata", "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const logoManifest = {
  schemaVersion: 2,
  asset: "jarvis",
  sourceOfTruth: "token/assets",
  variants: {
    canonical: "../assets/jarvis-green.png",
    dark: "../assets/jarvis-logo-dark.png",
    light: "../assets/jarvis-logo-light.png",
  },
  generatedSizes,
  generatedFormats: ["png", "webp"],
  displayPolicy: {
    defaultVariant: "canonical",
    fallbackAlt: "JARVIS token",
    preserveAspectRatio: true,
    backgroundRequired: false,
    useRepresentationBadge: true,
    keepTickerAcrossRepresentations: true,
  },
};
fs.writeFileSync(path.join(root, "metadata", "logo-manifest.json"), `${JSON.stringify(logoManifest, null, 2)}\n`);
console.log(`Generated token metadata manifests (${files.length} sources, ${generated.length} derivatives)`);
