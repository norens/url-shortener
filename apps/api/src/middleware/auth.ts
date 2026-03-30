import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
import type { Env } from "../index";

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { userId: string };
}>(async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("userId", user.id);
  await next();
});
