import { noStoreJson, requireIdempotencyKey, requireSaleEnabled } from "../../../lib/server/safety";
import { consumeRateLimit } from "../../../lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    requireSaleEnabled();
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limit = consumeRateLimit(`purchase:${forwarded}`, 5, 60_000);
    if (!limit.allowed) return noStoreJson({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } });
    return noStoreJson({
      error: "purchase_execution_not_configured",
      message: "Production purchase execution stays fail-closed until the verified sale object and transaction builder are configured."
    }, { status: 503 });
  } catch (error) {
    return noStoreJson({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
}
