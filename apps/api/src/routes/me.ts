import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseClient } from "../lib/supabase";

const me = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

me.get("/api/me", async (c) => {
  const userId = c.get("userId");

  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const [{ data: profile }, { count }] = await Promise.all([
    supabase
      .from("profiles")
      .select("links_limit")
      .eq("id", userId)
      .single(),
    supabase
      .from("urls")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return c.json({
    plan: "free",
    links_count: count ?? 0,
    links_limit: profile?.links_limit ?? 25,
  });
});

export default me;
