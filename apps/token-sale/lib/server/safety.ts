import "server-only";
import type { SaleConfig, SalePhase } from "../../types/sale";

const SUI_ADDRESS = /^0x[0-9a-fA-F]{64}$/;
const SAFE_IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{16,128}$/;

export function requireSaleEnabled(): void {
  if (process.env.JARVIS_SALE_ENABLED !== "true") throw new Error("Token sale is disabled");
}

export function assertSuiAddress(value: string, name = "address"): string {
  if (!SUI_ADDRESS.test(value)) throw new Error(`Invalid ${name}`);
  return value.toLowerCase();
}

export function requireIdempotencyKey(value: string | null): string {
  if (!value || !SAFE_IDEMPOTENCY_KEY.test(value)) throw new Error("Missing or invalid Idempotency-Key");
  return value;
}

export function activePhase(config: SaleConfig, now = new Date()): SalePhase | null {
  const t = now.getTime();
  return config.phases.find((phase) => phase.enabled && Date.parse(phase.startsAt) <= t && t <= Date.parse(phase.endsAt)) ?? null;
}

export function parsePositiveBaseUnits(value: unknown, maximum: bigint): bigint {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) throw new Error("Amount must be a positive base-unit integer string");
  const amount = BigInt(value);
  if (amount > maximum) throw new Error("Amount exceeds configured maximum");
  return amount;
}

export function noStoreJson(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(body), { ...init, headers });
}
