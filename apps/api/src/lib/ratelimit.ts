interface RateLimitEntry {
  count: number;
  expiresAt: number; // Unix ms
}

/**
 * Simple per-user rate limiter backed by Cloudflare KV.
 * Uses get/put with a JSON counter (no atomic incr in KV).
 */
export async function checkRateLimit(
  kv: KVNamespace,
  userId: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `rl:shorten:${userId}`;
  const now = Date.now();

  const entry = await kv.get<RateLimitEntry>(key, "json");

  // Window expired or first request — start new window
  if (!entry || now >= entry.expiresAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    };
    await kv.put(key, JSON.stringify(newEntry), {
      expirationTtl: windowSeconds,
    });
    return { allowed: true };
  }

  // Within window — increment
  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  const remainingTtl = Math.ceil((entry.expiresAt - now) / 1000);
  await kv.put(key, JSON.stringify(entry), {
    expirationTtl: Math.max(remainingTtl, 60),
  });

  return { allowed: true };
}
