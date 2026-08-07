import test from "node:test";
import assert from "node:assert/strict";
import { createJarvisCanonicalAsset } from "../functions/asset.ts";
import { InMemoryTokenStorage } from "../storage/memory.ts";
import { createJarvisTokenContext } from "../context/token-context.ts";

test("canonical storage rejects stale writers", async () => {
  const storage = new InMemoryTokenStorage();
  const asset = createJarvisCanonicalAsset({ verification: "deployment-gated" });
  const v1 = await storage.putCanonicalAsset(asset, 0);
  assert.equal(v1, 1);
  await assert.rejects(() => storage.putCanonicalAsset(asset, 0), /version conflict/);
});

test("requested bridge enablement is activation gated", () => {
  const context = createJarvisTokenContext({ JARVIS_BRIDGE_ENABLED: "true" });
  assert.equal(context.requestedBridgeEnabled, true);
  assert.equal(context.bridgeEnabled, false);
  assert.equal(context.activation.allowed, false);
});

test("snapshot list limit is bounded", async () => {
  const storage = new InMemoryTokenStorage();
  for (let i = 0; i < 510; i++) {
    await storage.appendSnapshot("health", {
      id: `s-${i}`,
      recordedAt: new Date(1_700_000_000_000 + i).toISOString(),
      digest: `${i}`,
      value: i,
    });
  }
  assert.equal((await storage.listSnapshots({ namespace: "health", limit: 9999 })).length, 500);
});
