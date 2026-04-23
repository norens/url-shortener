import type { CachedUrl } from "@qurl/shared";
import { CACHE_TTL_SECONDS } from "@qurl/shared";

function cacheKey(code: string): string {
  return `url:${code}`;
}

// === URL Cache ===

export async function getCachedUrl(
  kv: KVNamespace,
  code: string,
): Promise<CachedUrl | null> {
  return kv.get<CachedUrl>(cacheKey(code), "json");
}

export async function setCachedUrl(
  kv: KVNamespace,
  code: string,
  data: CachedUrl,
  expiresAt: string | null,
): Promise<void> {
  let ttl = CACHE_TTL_SECONDS;
  if (expiresAt) {
    const expiryMs = new Date(expiresAt).getTime() - Date.now();
    if (expiryMs > 0) {
      ttl = Math.min(ttl, Math.floor(expiryMs / 1000));
    }
  }
  ttl = Math.max(ttl, 60);
  await kv.put(cacheKey(code), JSON.stringify(data), { expirationTtl: ttl });
}

export async function deleteCachedUrl(
  kv: KVNamespace,
  code: string,
): Promise<void> {
  await kv.delete(cacheKey(code));
}

// === User Clicks Enforcement ===

export async function getUserClicksCheck(
  kv: KVNamespace,
  userId: string,
): Promise<"skip" | "track" | null> {
  return kv.get(`clicks_check:user:${userId}`, "text") as Promise<
    "skip" | "track" | null
  >;
}

export async function setUserClicksCheck(
  kv: KVNamespace,
  userId: string,
  decision: "skip" | "track",
): Promise<void> {
  await kv.put(`clicks_check:user:${userId}`, decision, {
    expirationTtl: 300,
  });
}

// === Rate Limiting ===

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

async function checkRateLimitByKey(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const entry = await kv.get<RateLimitEntry>(key, "json");

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

export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  return checkRateLimitByKey(
    kv,
    `rl:shorten:${identifier}`,
    limit,
    windowSeconds,
  );
}

export async function checkQrRateLimit(
  kv: KVNamespace,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  return checkRateLimitByKey(
    kv,
    `rl:qr-svg:${identifier}`,
    limit,
    windowSeconds,
  );
}
