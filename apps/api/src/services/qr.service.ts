import { buildUrlPayload, generateSvg } from "@nazarf/qrforge";
import {
  DEFAULT_QR_CONFIG,
  QR_CACHE_TTL_SECONDS,
  QR_SOURCE_PARAM,
  QR_SOURCE_VALUE,
  SHORT_URL_BASE,
} from "@qurl/shared";
import { getCachedQrSvg, setCachedQrSvg } from "../lib/qr-cache";
import * as urlRepo from "../repositories/url.repository";
import type { Deps } from "../types";

export interface GetQrSvgResult {
  svg: string;
  fromCache: boolean;
  /** Set when the SVG was freshly rendered and needs to be persisted. */
  cachePromise?: Promise<void>;
}

/**
 * Returns the server-rendered QR SVG for a short code, using {@link DEFAULT_QR_CONFIG}.
 *
 * Week 1 always uses defaults. When per-link customization lands (Week 2), look
 * up `qr_configs` here and merge on top of `DEFAULT_QR_CONFIG` — everything
 * else (cache key variant, caller, route) stays the same.
 *
 * Returns `null` when the link does not exist, is inactive, or has expired.
 */
export async function getQrSvg(
  deps: Deps,
  code: string,
): Promise<GetQrSvgResult | null> {
  // 1. Cache first — we cache the final SVG, not just the link row.
  const cached = await getCachedQrSvg(deps.kv, code);
  if (cached) {
    return { svg: cached, fromCache: true };
  }

  // 2. Load the link row.
  const { data, error } = await urlRepo.findForRedirect(deps.supabase, code);
  if (error || !data) return null;
  if (!data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at) <= new Date()) return null;

  // 3. Encode the short URL (not the destination) with the QR source marker so
  //    the redirect handler can tag scans differently from direct clicks.
  const shortUrl = new URL(`/${code}`, SHORT_URL_BASE);
  shortUrl.searchParams.set(QR_SOURCE_PARAM, QR_SOURCE_VALUE);

  const svg = generateSvg({
    payload: buildUrlPayload(shortUrl.toString()),
    size: DEFAULT_QR_CONFIG.size_px,
    style: {
      fgColor: DEFAULT_QR_CONFIG.fg_color ?? undefined,
      bgColor: DEFAULT_QR_CONFIG.bg_color ?? undefined,
    },
    ecc: DEFAULT_QR_CONFIG.ecc ?? undefined,
  });

  // 4. Caller handles waitUntil for the cache write.
  const cachePromise = setCachedQrSvg(deps.kv, code, svg, QR_CACHE_TTL_SECONDS);

  return { svg, fromCache: false, cachePromise };
}
