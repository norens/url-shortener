import type { Redis } from "@upstash/redis/cloudflare";

/**
 * Simple per-user rate limiter backed by Upstash Redis.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
 */
export async function checkRateLimit(
  redis: Redis,
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `rl:shorten:${userId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    // First request in this window — set expiry
    await redis.expire(key, windowSeconds);
  }

  if (count > limit) {
    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfter: ttl > 0 ? ttl : windowSeconds };
  }

  return { allowed: true };
}
