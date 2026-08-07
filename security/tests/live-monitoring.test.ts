import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTokenStorage } from "../storage/memory.ts";
import { TokenMonitoringService } from "../services/monitoring.ts";
import { evaluateTokenTransferGate } from "../security/runtime-gate.ts";

const NOW = new Date("2026-08-07T04:00:00.000Z");

function provider(overrides: Partial<{ locked: bigint; bridged: bigint; freeze: string | null; observedAt: string }> = {}) {
  const observedAt = overrides.observedAt ?? NOW.toISOString();
  return {
    async observeSui() {
      return { chain: "sui" as const, environment: "testnet" as const, identity: "0x1::jarvis::JARVIS", decimals: 6, totalSupplyBaseUnits: 1000n, observedAt, source: "test" };
    },
    async observeSolana() {
      return { chain: "solana" as const, environment: "testnet" as const, identity: "11111111111111111111111111111111", decimals: 6, totalSupplyBaseUnits: overrides.bridged ?? 100n, freezeAuthority: overrides.freeze ?? null, observedAt, source: "test" };
    },
    async observeReserve() {
      return { environment: "testnet" as const, lockedCanonicalBaseUnits: overrides.locked ?? 100n, observedAt, source: "test" };
    },
  };
}

test("monitoring permits exactly backed verified state", async () => {
  const storage = new InMemoryTokenStorage();
  const service = new TokenMonitoringService(provider(), storage, { maxObservationAgeMs: 60_000, failClosed: true });
  const report = await service.inspect({ expectedSuiCoinType: "0x1::jarvis::JARVIS", expectedSolanaMint: "11111111111111111111111111111111", now: NOW });
  assert.equal(report.healthy, true);
  assert.equal(report.pauseNewTransfers, false);
  assert.equal((await storage.listSnapshots({ namespace: "onchain-observations" })).length, 1);
});

test("monitoring fails closed on unbacked supply", async () => {
  const service = new TokenMonitoringService(provider({ bridged: 101n, locked: 100n }), new InMemoryTokenStorage(), { maxObservationAgeMs: 60_000, failClosed: true });
  const report = await service.inspect({ expectedSuiCoinType: "0x1::jarvis::JARVIS", expectedSolanaMint: "11111111111111111111111111111111", now: NOW });
  assert.equal(report.pauseNewTransfers, true);
  assert.ok(report.reasons.includes("bridged-supply-exceeds-backed-reserve"));
});

test("transfer gate requires healthy monitoring", () => {
  const result = evaluateTokenTransferGate({ requestedBridgeEnabled: true, activation: { allowed: true, reasons: [] } });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("monitoring-unavailable"));
});
