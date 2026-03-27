import { Redis } from "@upstash/redis";
import type { CachedUrl } from "@qurl/shared";
import { CACHE_TTL_SECONDS } from "@qurl/shared";

export function createRedisClient(url: string, token: string) {
  return new Redis({ url, token });
}

function cacheKey(code: string): string {
  return `url:${code}`;
}

export async function getCachedUrl(
  redis: Redis,
  code: string
): Promise<CachedUrl | null> {
  const data = await redis.get<CachedUrl>(cacheKey(code));
  return data ?? null;
}

export async function setCachedUrl(
  redis: Redis,
  code: string,
  data: CachedUrl,
  expiresAt: string | null
): Promise<void> {
  let ttl = CACHE_TTL_SECONDS;

  if (expiresAt) {
    const expiryMs = new Date(expiresAt).getTime() - Date.now();
    if (expiryMs > 0) {
      ttl = Math.min(ttl, Math.floor(expiryMs / 1000));
    }
  }

  await redis.set(cacheKey(code), data, { ex: ttl });
}

export async function deleteCachedUrl(
  redis: Redis,
  code: string
): Promise<void> {
  await redis.del(cacheKey(code));
}
