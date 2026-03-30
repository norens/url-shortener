import type { CachedUrl } from "@qurl/shared";
import { CACHE_TTL_SECONDS } from "@qurl/shared";

function cacheKey(code: string): string {
  return `url:${code}`;
}

export async function getCachedUrl(
  kv: KVNamespace,
  code: string
): Promise<CachedUrl | null> {
  return kv.get<CachedUrl>(cacheKey(code), "json");
}

export async function setCachedUrl(
  kv: KVNamespace,
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

  // KV requires expirationTtl >= 60
  ttl = Math.max(ttl, 60);

  await kv.put(cacheKey(code), JSON.stringify(data), { expirationTtl: ttl });
}

export async function deleteCachedUrl(
  kv: KVNamespace,
  code: string
): Promise<void> {
  await kv.delete(cacheKey(code));
}
