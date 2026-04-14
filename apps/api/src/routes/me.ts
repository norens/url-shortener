import { Hono } from "hono";
import { createSupabaseClient } from "../lib/supabase";
import { getProfile } from "../services/user.service";
import type { Env } from "../types";

const me = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

me.get("/api/me", async (c) => {
  const userId = c.get("userId");

  const deps = {
    supabase: createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    kv: c.env.URL_CACHE,
  };

  const result = await getProfile(deps, userId);
  return c.json(result);
});

export default me;
