import { Redis } from "@upstash/redis";

// Returns a Redis client if env vars are set, null otherwise.
// Callers must handle the null case (fallback to in-memory).
export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}
