import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { createSupabaseClient } from "../lib/supabase";
import { setCachedUrl } from "../lib/kv";
import { generateShortCode } from "../lib/codegen";
import { shortenSchema } from "../lib/validation";
import { checkRateLimit } from "../lib/ratelimit";
import { MAX_COLLISION_RETRIES, SHORT_URL_BASE } from "@qurl/shared";

const shorten = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

shorten.post("/api/shorten", zValidator("json", shortenSchema), async (c) => {
  const userId = c.get("userId");
  const { long_url, alias, title, expires_at } = c.req.valid("json");

  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const kv = c.env.URL_CACHE;

  // Per-user rate limit: 20 requests per hour
  const rl = await checkRateLimit(kv, userId, 20, 3600);
  if (!rl.allowed) {
    return c.json(
      { error: "Rate limit exceeded. Try again in an hour." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Check user's link count against limit
  const { count } = await supabase
    .from("urls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("links_limit")
    .eq("id", userId)
    .single();

  if (profile && count !== null && count >= profile.links_limit) {
    return c.json(
      { error: "Link limit reached. Upgrade your plan for more links." },
      429
    );
  }

  // Generate or validate short code
  let shortCode: string;

  if (alias) {
    // Check if alias is taken
    const { data: existing } = await supabase
      .from("urls")
      .select("short_code")
      .eq("short_code", alias)
      .single();

    if (existing) {
      return c.json({ error: "This alias is already taken" }, 409);
    }
    shortCode = alias;
  } else {
    // Generate random code with collision retry
    shortCode = "";
    for (let i = 0; i < MAX_COLLISION_RETRIES; i++) {
      const candidate = generateShortCode();
      const { data: existing } = await supabase
        .from("urls")
        .select("short_code")
        .eq("short_code", candidate)
        .single();

      if (!existing) {
        shortCode = candidate;
        break;
      }
    }

    if (!shortCode) {
      return c.json(
        { error: "Failed to generate unique code. Please try again." },
        500
      );
    }
  }

  // Insert URL
  const { data: url, error } = await supabase
    .from("urls")
    .insert({
      user_id: userId,
      short_code: shortCode,
      long_url,
      title: title ?? null,
      expires_at: expires_at ?? null,
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: "Failed to create short link" }, 500);
  }

  // Cache the new URL
  c.executionCtx.waitUntil(
    setCachedUrl(
      kv,
      shortCode,
      { long_url, expires_at: expires_at ?? null, is_active: true },
      expires_at ?? null
    )
  );

  return c.json(
    {
      short_code: shortCode,
      short_url: `${SHORT_URL_BASE}/${shortCode}`,
      long_url,
      title: url.title,
      created_at: url.created_at,
    },
    201
  );
});

export default shorten;
