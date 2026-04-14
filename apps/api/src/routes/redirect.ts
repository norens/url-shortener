import { Hono } from "hono";
import { createSupabaseClient } from "../lib/supabase";
import { trackClickIfAllowed } from "../services/click.service";
import { resolveLink } from "../services/link.service";
import type { Env } from "../types";
import { CF_HEADERS } from "../types";

const redirect = new Hono<{ Bindings: Env }>();

redirect.get("/:code", async (c) => {
  const code = c.req.param("code");

  if (code.startsWith("api") || code === "health") {
    return c.notFound();
  }

  const deps = {
    supabase: createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    kv: c.env.URL_CACHE,
  };

  const { cached, cachePromise } = await resolveLink(deps, code);
  if (cachePromise) {
    c.executionCtx.waitUntil(cachePromise);
  }

  const meta = {
    country: c.req.header(CF_HEADERS.COUNTRY) ?? null,
    city: c.req.header(CF_HEADERS.CITY) ?? null,
    userAgent: c.req.header("user-agent") ?? null,
    referer: c.req.header("referer") ?? null,
  };

  c.executionCtx.waitUntil(
    trackClickIfAllowed(deps, code, cached.user_id, meta),
  );

  return c.redirect(cached.long_url, 302);
});

export default redirect;
