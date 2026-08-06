import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TOKEN } from "../packages/token-core/src/constants.js";

interface AssetMetadata {
  name: string;
  symbol: string;
  decimals: number;
  image: string;
  supply: { baseUnits: string };
  deployment: { verified: boolean };
  properties: {
    files: Array<{
      uri: string;
      type: string;
      width: number;
      height: number;
      sha256: string;
    }>;
  };
}

describe("JARVIS metadata assets", () => {
  it("binds every declared PNG to its dimensions and SHA-256 digest", async () => {
    const metadataPath = resolve("metadata/metadata.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as AssetMetadata;

    expect(metadata.name).toBe(TOKEN.name);
    expect(metadata.symbol).toBe(TOKEN.symbol);
    expect(metadata.decimals).toBe(TOKEN.decimals);
    expect(metadata.supply.baseUnits).toBe(TOKEN.maximumBaseUnits.toString());
    expect(metadata.deployment.verified).toBe(false);
    expect(metadata.properties.files).toHaveLength(3);

    for (const file of metadata.properties.files) {
      const bytes = await readFile(resolve(dirname(metadataPath), file.uri));
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(bytes.readUInt32BE(16)).toBe(file.width);
      expect(bytes.readUInt32BE(20)).toBe(file.height);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);
      expect(file.type).toBe("image/png");
    }

    expect(metadata.properties.files.some((file) => file.uri === metadata.image)).toBe(true);
  });
});
