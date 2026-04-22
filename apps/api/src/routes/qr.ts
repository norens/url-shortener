import { ALIAS_REGEX, MAX_ALIAS_LENGTH } from "@qurl/shared";
import { Hono } from "hono";
import { createSupabaseClient } from "../lib/supabase";
import { checkQrRateLimit } from "../repositories/cache.repository";
import { getQrSvg } from "../services/qr.service";
import { CF_HEADERS, type Env } from "../types";

const QR_RATE_LIMIT = 300;
const QR_RATE_WINDOW_SECONDS = 3600;

const qr = new Hono<{ Bindings: Env }>();

qr.get("/api/qr/:file", async (c) => {
  const file = c.req.param("file");

  // Route shape: /api/qr/<code>.svg — Week 1 is SVG only.
  if (!file.endsWith(".svg")) {
    return c.json({ error: "not_found" }, 404);
  }
  const code = file.slice(0, -".svg".length);

  // Match the project's short_code/alias validation exactly.
  if (!code || code.length > MAX_ALIAS_LENGTH || !ALIAS_REGEX.test(code)) {
    return c.json({ error: "invalid_code" }, 400);
  }

  // IP-based rate limit: 300/hr per IP on this endpoint.
  const ip =
    c.req.header(CF_HEADERS.CONNECTING_IP) ||
    c.req.header("x-forwarded-for") ||
    "unknown";

  const rl = await checkQrRateLimit(
    c.env.URL_CACHE,
    ip,
    QR_RATE_LIMIT,
    QR_RATE_WINDOW_SECONDS,
  );
  if (!rl.allowed) {
    const res = c.json({ error: "rate_limited" }, 429);
    if (rl.retryAfter) {
      res.headers.set("Retry-After", String(rl.retryAfter));
    }
    return res;
  }

  const deps = {
    supabase: createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    kv: c.env.URL_CACHE,
  };

  const result = await getQrSvg(deps, code);
  if (!result) {
    return c.json({ error: "not_found" }, 404);
  }
  if (result.cachePromise) {
    c.executionCtx.waitUntil(result.cachePromise);
  }

  return new Response(result.svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, immutable",
      "X-Qurl-Qr": "default",
    },
  });
});

export default qr;
