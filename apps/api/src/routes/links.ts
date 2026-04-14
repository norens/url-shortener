import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createSupabaseClient } from "../lib/supabase";
import { updateLinkSchema } from "../lib/validation";
import { deleteLink, listLinks, updateLink } from "../services/link.service";
import type { Env } from "../types";

const links = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

links.get("/api/links", async (c) => {
  const userId = c.get("userId");

  const deps = {
    supabase: createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    kv: c.env.URL_CACHE,
  };

  const result = await listLinks(deps, userId, {
    page: parseInt(c.req.query("page") ?? "1", 10),
    perPage: parseInt(c.req.query("per_page") ?? "20", 10),
    search: c.req.query("search") ?? "",
    sort: c.req.query("sort") ?? "created_at",
    ascending: c.req.query("order") === "asc",
  });

  return c.json(result);
});

links.patch(
  "/api/links/:code",
  zValidator("json", updateLinkSchema),
  async (c) => {
    const userId = c.get("userId");
    const code = c.req.param("code");
    const updates = c.req.valid("json");

    const deps = {
      supabase: createSupabaseClient(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      kv: c.env.URL_CACHE,
    };

    const result = await updateLink(deps, userId, code, updates);
    c.executionCtx.waitUntil(result.cachePromise);

    return c.json(result.data);
  },
);

links.delete("/api/links/:code", async (c) => {
  const userId = c.get("userId");
  const code = c.req.param("code");

  const deps = {
    supabase: createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    kv: c.env.URL_CACHE,
  };

  const result = await deleteLink(deps, userId, code);
  c.executionCtx.waitUntil(result.cachePromise);

  return c.json({ success: true });
});

export default links;
