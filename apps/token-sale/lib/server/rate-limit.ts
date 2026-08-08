import "server-only";

type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

export function assertRateLimitBackendReady(): void {
  if (process.env.NODE_ENV === "production" && process.env.JARVIS_RATE_LIMIT_BACKEND !== "redis") {
    throw new Error("Production sale requires a shared Redis-compatible rate-limit backend");
  }
}

/** Development/local fallback. Production must replace this with the shared backend adapter. */
export function consumeRateLimit(key: string, limit = 20, windowMs = 60_000): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  assertRateLimitBackendReady();
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetsAt <= now ? { count: 0, resetsAt: now + windowMs } : existing;
  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000)) };
}
