import type { Profile } from "@qurl/shared";
import { PLAN_LIMITS } from "@qurl/shared";
import { Hono } from "hono";
import type { Env } from "../types";
import { parseDeviceType } from "../lib/device";
import {
  getCachedUrl,
  getUserClicksCheck,
  setCachedUrl,
  setUserClicksCheck,
} from "../lib/kv";
import { createSupabaseClient } from "../lib/supabase";

const redirect = new Hono<{ Bindings: Env }>();

redirect.get("/:code", async (c) => {
  const code = c.req.param("code");

  // Skip API and health routes
  if (code.startsWith("api") || code === "health") {
    return c.notFound();
  }

  const kv = c.env.URL_CACHE;
  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // 1. Try cache first
  let cached = await getCachedUrl(kv, code);

  // 2. Cache miss — query database
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

    // Cache for next request
    c.executionCtx.waitUntil(setCachedUrl(kv, code, cached, data.expires_at));
  }

  // 3. Check if link is active and not expired
  if (!cached.is_active) {
    return c.json({ error: "Link has been deactivated" }, 410);
  }

  if (cached.expires_at && new Date(cached.expires_at) < new Date()) {
    return c.json({ error: "Link has expired" }, 410);
  }

  // 4. Determine whether to track this click (enforcement check)
  const country = c.req.header("cf-ipcountry") ?? null;
  const city = c.req.header("cf-ipcity") ?? null;
  const userAgent = c.req.header("user-agent") ?? null;
  const referer = c.req.header("referer") ?? null;

  c.executionCtx.waitUntil(
    shouldTrackClick(kv, supabase, cached.user_id)
      .then((shouldTrack) => {
        if (shouldTrack) {
          return trackClick(supabase, code, {
            country,
            city,
            userAgent,
            referer,
          });
        }
      })
      .catch(() => {
        // Enforcement check failed — track anyway to avoid losing data
        return trackClick(supabase, code, {
          country,
          city,
          userAgent,
          referer,
        });
      }),
  );

  // 5. 302 redirect — always redirect regardless of limit
  return c.redirect(cached.long_url, 302);
});

/**
 * Determine whether a click should be tracked based on the owner's plan limits.
 * Anonymous links (no user_id) are always tracked.
 * Enforcement is per-user (monthly aggregate across all links), not per-link.
 * Uses KV cache to avoid DB queries on every request.
 */
async function shouldTrackClick(
  kv: KVNamespace,
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string | null,
): Promise<boolean> {
  // Anonymous links: always track
  if (!userId) {
    return true;
  }

  // Check per-user KV cache for previous enforcement decision
  const cachedDecision = await getUserClicksCheck(kv, userId);
  if (cachedDecision === "skip") return false;
  if (cachedDecision === "track") return true;

  // Cache miss — query DB for plan and current monthly click count
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [profileResult, monthlyClicksResult] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).single(),
    supabase.rpc("count_user_monthly_clicks", {
      p_user_id: userId,
      p_month_start: monthStart.toISOString(),
    }),
  ]);

  const plan = (profileResult.data?.plan ?? "free") as Profile["plan"];
  const monthlyClicks: number = monthlyClicksResult.data ?? 0;
  const limit = PLAN_LIMITS[plan].clicks_per_month;

  // Unlimited plan
  if (limit === -1) {
    await setUserClicksCheck(kv, userId, "track");
    return true;
  }

  // Over limit
  if (monthlyClicks >= limit) {
    await setUserClicksCheck(kv, userId, "skip");
    return false;
  }

  // Under limit
  await setUserClicksCheck(kv, userId, "track");
  return true;
}

interface ClickMeta {
  country: string | null;
  city: string | null;
  userAgent: string | null;
  referer: string | null;
}

async function trackClick(
  supabase: ReturnType<typeof createSupabaseClient>,
  code: string,
  meta: ClickMeta,
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
