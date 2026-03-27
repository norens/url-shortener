import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseClient } from "../lib/supabase";
import { createRedisClient, getCachedUrl, setCachedUrl } from "../lib/redis";
import { parseDeviceType } from "../lib/device";
import type { CachedUrl } from "@qurl/shared";

const redirect = new Hono<{ Bindings: Env }>();

redirect.get("/:code", async (c) => {
  const code = c.req.param("code");

  // Skip API and health routes
  if (code.startsWith("api") || code === "health") {
    return c.notFound();
  }

  const redis = createRedisClient(
    c.env.UPSTASH_REDIS_REST_URL,
    c.env.UPSTASH_REDIS_REST_TOKEN
  );
  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Try cache first
  let cached = await getCachedUrl(redis, code);

  // 2. Cache miss — query database
  if (!cached) {
    const { data, error } = await supabase
      .from("urls")
      .select("long_url, expires_at, is_active")
      .eq("short_code", code)
      .single();

    if (error || !data) {
      return c.json({ error: "Not found" }, 404);
    }

    cached = {
      long_url: data.long_url,
      expires_at: data.expires_at,
      is_active: data.is_active,
    };

    // Cache for next request
    c.executionCtx.waitUntil(setCachedUrl(redis, code, cached, data.expires_at));
  }

  // 3. Check if link is active and not expired
  if (!cached.is_active) {
    return c.json({ error: "Link has been deactivated" }, 410);
  }

  if (cached.expires_at && new Date(cached.expires_at) < new Date()) {
    return c.json({ error: "Link has expired" }, 410);
  }

  // 4. Fire-and-forget: track analytics
  const country = c.req.header("cf-ipcountry") ?? null;
  const city = c.req.header("cf-ipcity") ?? null;
  const userAgent = c.req.header("user-agent") ?? null;
  const referer = c.req.header("referer") ?? null;
  c.executionCtx.waitUntil(
    trackClick(supabase, code, { country, city, userAgent, referer })
  );

  // 5. 302 redirect
  return c.redirect(cached.long_url, 302);
});

interface ClickMeta {
  country: string | null;
  city: string | null;
  userAgent: string | null;
  referer: string | null;
}

async function trackClick(
  supabase: ReturnType<typeof createSupabaseClient>,
  code: string,
  meta: ClickMeta
) {
  const { country, city, userAgent, referer } = meta;
  const deviceType = parseDeviceType(userAgent);

  await Promise.all([
    // Increment click counter
    supabase.rpc("increment_clicks", { code }),
    // Insert scan record
    supabase.from("url_scans").insert({
      short_code: code,
      country,
      city,
      user_agent: userAgent,
      referer,
      device_type: deviceType,
    }),
  ]);
}

export default redirect;
