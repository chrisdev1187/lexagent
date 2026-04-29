import { createMiddleware } from "hono/factory";
import { getRedis } from "../lib/redis.js";

// ── Redis client (lazy, singleton) ────────────────────────────────────────────
let _redis = getRedis();

// ── In-memory fallback (token bucket) ────────────────────────────────────────
interface Bucket { tokens: number; lastRefill: number; }
const buckets = new Map<string, Map<string, Bucket>>();

function inMemoryAllow(namespace: string, userId: string, rpm: number): boolean {
  if (!buckets.has(namespace)) buckets.set(namespace, new Map());
  const ns = buckets.get(namespace)!;
  const now = Date.now();
  let b = ns.get(userId);
  if (!b) {
    b = { tokens: rpm, lastRefill: now };
    ns.set(userId, b);
  }
  const elapsed = (now - b.lastRefill) / 60000;
  b.tokens = Math.min(rpm, b.tokens + elapsed * rpm);
  b.lastRefill = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

// ── Redis fixed-window counter ────────────────────────────────────────────────
// Key: rl:{namespace}:{userId}, 60-second window, limit = rpm.
async function redisAllow(namespace: string, userId: string, rpm: number): Promise<boolean> {
  const key = `rl:${namespace}:${userId}`;
  // Pipeline: INCR then EXPIRE (EXPIRE is no-op after first call per window)
  const count = await _redis!.incr(key);
  if (count === 1) await _redis!.expire(key, 60);
  return count <= rpm;
}

// ── Middleware ────────────────────────────────────────────────────────────────
export function rateLimit(namespace: string, rpm: number) {
  return createMiddleware(async (c, next) => {
    const userId = c.get("userId") ?? c.req.header("x-forwarded-for") ?? "anon";

    let allowed: boolean;
    if (_redis) {
      try {
        allowed = await redisAllow(namespace, userId, rpm);
      } catch {
        // Redis unreachable — fall back to in-memory for this request
        allowed = inMemoryAllow(namespace, userId, rpm);
      }
    } else {
      allowed = inMemoryAllow(namespace, userId, rpm);
    }

    if (!allowed) {
      return c.json({ error: "Rate limit exceeded — try again shortly" }, 429);
    }
    await next();
  });
}
