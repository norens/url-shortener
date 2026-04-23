/**
 * KV helper for server-rendered QR SVGs. Reuses the URL_CACHE namespace with a
 * `qr:svg:` key prefix to avoid collision with url:* and rl:* keys.
 */

function qrCacheKey(code: string, variant: string): string {
  return `qr:svg:${code}:${variant}`;
}

export async function getCachedQrSvg(
  kv: KVNamespace,
  code: string,
  variant = "default",
): Promise<string | null> {
  return kv.get(qrCacheKey(code, variant), "text");
}

export async function setCachedQrSvg(
  kv: KVNamespace,
  code: string,
  svg: string,
  ttlSeconds: number,
  variant = "default",
): Promise<void> {
  await kv.put(qrCacheKey(code, variant), svg, {
    expirationTtl: Math.max(ttlSeconds, 60),
  });
}
