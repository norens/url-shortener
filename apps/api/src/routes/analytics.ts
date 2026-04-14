import { Hono } from "hono";
import type { Env } from "../types";
import { createSupabaseClient } from "../lib/supabase";
import { getAnalytics } from "../services/analytics.service";

const analytics = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

analytics.get("/api/analytics/:code", async (c) => {
  const userId = c.get("userId");
  const code = c.req.param("code");
  const period = c.req.query("period");

  const deps = {
    supabase: createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY),
    kv: c.env.URL_CACHE,
  };

  const result = await getAnalytics(deps, userId, code, period);
  return c.json(result);
});

export default analytics;
