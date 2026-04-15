import { createMiddleware } from "hono/factory";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

// In-memory token buckets: Map<userId, Bucket>
// For production with multiple API instances, swap this for Redis.
const buckets = new Map<string, Map<string, Bucket>>();

function getBucket(namespace: string, userId: string, rpm: number): Bucket {
  if (!buckets.has(namespace)) buckets.set(namespace, new Map());
  const ns = buckets.get(namespace)!;
  const now = Date.now();
  let b = ns.get(userId);
  if (!b) {
    b = { tokens: rpm, lastRefill: now };
    ns.set(userId, b);
  }
  // Refill tokens based on elapsed time (token bucket algorithm)
  const elapsed = (now - b.lastRefill) / 60000; // minutes elapsed
  b.tokens = Math.min(rpm, b.tokens + elapsed * rpm);
  b.lastRefill = now;
  return b;
}

export function rateLimit(namespace: string, rpm: number) {
  return createMiddleware(async (c, next) => {
    const userId = c.get("userId") ?? c.req.header("x-forwarded-for") ?? "anon";
    const bucket = getBucket(namespace, userId, rpm);
    if (bucket.tokens < 1) {
      return c.json({ error: "Rate limit exceeded — try again shortly" }, 429);
    }
    bucket.tokens -= 1;
    await next();
  });
}
