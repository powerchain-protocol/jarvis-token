import { loadSaleConfig } from "../../../lib/server/config";
import { activePhase, noStoreJson, parsePositiveBaseUnits, requireSaleEnabled } from "../../../lib/server/safety";
import { consumeRateLimit } from "../../../lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    requireSaleEnabled();
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limit = consumeRateLimit(`quote:${forwarded}`);
    if (!limit.allowed) return noStoreJson({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } });
    const config = loadSaleConfig();
    const phase = activePhase(config);
    if (!phase) return noStoreJson({ error: "no_active_sale_phase" }, { status: 409 });
    const body = await request.json() as { jarvisBaseUnits?: unknown; paymentAsset?: unknown };
    const jarvis = parsePositiveBaseUnits(body.jarvisBaseUnits, BigInt(phase.maxPurchaseBaseUnits));
    const price = phase.prices.find((x) => x.paymentAsset === body.paymentAsset);
    if (!price) return noStoreJson({ error: "unsupported_payment_asset" }, { status: 400 });
    const wholeTokenBase = 1_000_000n;
    const payment = (jarvis * BigInt(price.paymentBaseUnitsPerJarvisWhole) + wholeTokenBase - 1n) / wholeTokenBase;
    return noStoreJson({ phaseId: phase.id, jarvisBaseUnits: jarvis.toString(), paymentAsset: price.paymentAsset, paymentBaseUnits: payment.toString() });
  } catch (error) {
    return noStoreJson({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
}
