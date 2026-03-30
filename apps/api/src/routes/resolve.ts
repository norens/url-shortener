import { Hono } from "hono";
import type { Env } from "../index";
import { getCachedUrl, setCachedUrl } from "../lib/kv";
import { createSupabaseClient } from "../lib/supabase";

const resolve = new Hono<{ Bindings: Env }>();

resolve.get("/api/resolve/:code", async (c) => {
  const code = c.req.param("code");

  const kv = c.env.URL_CACHE;
  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Try cache
  let cached = await getCachedUrl(kv, code);

  if (!cached) {
    const { data, error } = await supabase
      .from("urls")
      .select("long_url, expires_at, is_active, user_id")
      .eq("short_code", code)
      .single();

    if (error || !data) {
      return c.json({ error: "Not found" }, 404);
    }

    cached = {
      long_url: data.long_url,
      expires_at: data.expires_at,
      is_active: data.is_active,
      user_id: data.user_id,
    };

    c.executionCtx.waitUntil(setCachedUrl(kv, code, cached, data.expires_at));
  }

  if (!cached.is_active) {
    return c.json({ error: "Link has been deactivated" }, 410);
  }

  if (cached.expires_at && new Date(cached.expires_at) < new Date()) {
    return c.json({ error: "Link has expired" }, 410);
  }

  return c.json({ short_code: code, long_url: cached.long_url });
});

export default resolve;
