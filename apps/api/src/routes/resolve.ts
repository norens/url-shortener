import { Hono } from "hono";
import type { Env } from "../types";
import { createSupabaseClient } from "../lib/supabase";
import { resolveLink } from "../services/link.service";

const resolve = new Hono<{ Bindings: Env }>();

resolve.get("/api/resolve/:code", async (c) => {
  const code = c.req.param("code");

  const deps = {
    supabase: createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY),
    kv: c.env.URL_CACHE,
  };

  const { cached, cachePromise } = await resolveLink(deps, code);
  if (cachePromise) {
    c.executionCtx.waitUntil(cachePromise);
  }

  return c.json({ short_code: code, long_url: cached.long_url });
});

export default resolve;
