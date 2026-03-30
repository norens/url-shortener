import type { CachedUrl } from "@qurl/shared";
import { CACHE_TTL_SECONDS } from "@qurl/shared";

function cacheKey(code: string): string {
  return `url:${code}`;
}

function clicksCheckKey(code: string): string {
  return `clicks_check:${code}`;
}

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

  // KV requires expirationTtl >= 60
  ttl = Math.max(ttl, 60);

  await kv.put(cacheKey(code), JSON.stringify(data), { expirationTtl: ttl });
}

export async function deleteCachedUrl(
  kv: KVNamespace,
  code: string,
): Promise<void> {
  await kv.delete(cacheKey(code));
}

/** Get cached clicks enforcement decision: "skip" | "track" | null */
export async function getClicksCheck(
  kv: KVNamespace,
  code: string,
): Promise<"skip" | "track" | null> {
  return kv.get(clicksCheckKey(code), "text") as Promise<
    "skip" | "track" | null
  >;
}

/** Cache clicks enforcement decision for 5 minutes */
export async function setClicksCheck(
  kv: KVNamespace,
  code: string,
  decision: "skip" | "track",
): Promise<void> {
  await kv.put(clicksCheckKey(code), decision, { expirationTtl: 300 });
}

/** Get cached user-level clicks enforcement decision: "skip" | "track" | null */
export async function getUserClicksCheck(
  kv: KVNamespace,
  userId: string,
): Promise<"skip" | "track" | null> {
  return kv.get(`clicks_check:user:${userId}`, "text") as Promise<
    "skip" | "track" | null
  >;
}

/** Cache user-level clicks enforcement decision for 5 minutes */
export async function setUserClicksCheck(
  kv: KVNamespace,
  userId: string,
  decision: "skip" | "track",
): Promise<void> {
  await kv.put(`clicks_check:user:${userId}`, decision, {
    expirationTtl: 300,
  });
}
