import { zValidator } from "@hono/zod-validator";
import { SHORT_URL_BASE } from "@qurl/shared";
import { Hono } from "hono";
import type { Env } from "../index";
import { deleteCachedUrl } from "../lib/kv";
import { createSupabaseClient } from "../lib/supabase";
import { updateLinkSchema } from "../lib/validation";

const links = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

// List user's links (paginated)
links.get("/api/links", async (c) => {
  const userId = c.get("userId");
  const page = parseInt(c.req.query("page") ?? "1", 10);
  const perPage = parseInt(c.req.query("per_page") ?? "20", 10);
  const search = c.req.query("search") ?? "";
  const sort = c.req.query("sort") ?? "created_at";
  const order = c.req.query("order") === "asc";

  const offset = (page - 1) * perPage;

  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let query = supabase
    .from("urls")
    .select(
      "id, short_code, long_url, title, is_active, expires_at, created_at, updated_at, click_totals(total_clicks)",
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (search) {
    query = query.or(
      `long_url.ilike.%${search}%,title.ilike.%${search}%,short_code.ilike.%${search}%`,
    );
  }

  query = query
    .order(sort, { ascending: order })
    .range(offset, offset + perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: "Failed to fetch links" }, 500);
  }

  const total = count ?? 0;
  const links_data = (data ?? []).map((item) => ({
    id: item.id,
    short_code: item.short_code,
    short_url: `${SHORT_URL_BASE}/${item.short_code}`,
    long_url: item.long_url,
    title: item.title,
    is_active: item.is_active,
    expires_at: item.expires_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
    total_clicks:
      (item.click_totals as { total_clicks: number }[] | null)?.[0]
        ?.total_clicks ?? 0,
  }));

  return c.json({
    data: links_data,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
});

// Update a link
links.patch(
  "/api/links/:code",
  zValidator("json", updateLinkSchema),
  async (c) => {
    const userId = c.get("userId");
    const code = c.req.param("code");
    const updates = c.req.valid("json");

    const supabase = createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Verify ownership
    const { data: existing } = await supabase
      .from("urls")
      .select("user_id")
      .eq("short_code", code)
      .single();

    if (!existing) {
      return c.json({ error: "Link not found" }, 404);
    }

    if (existing.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { data, error } = await supabase
      .from("urls")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("short_code", code)
      .select()
      .single();

    if (error) {
      return c.json({ error: "Failed to update link" }, 500);
    }

    // Invalidate cache
    c.executionCtx.waitUntil(deleteCachedUrl(c.env.URL_CACHE, code));

    return c.json(data);
  },
);

// Deactivate a link (soft delete)
links.delete("/api/links/:code", async (c) => {
  const userId = c.get("userId");
  const code = c.req.param("code");

  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Verify ownership
  const { data: existing } = await supabase
    .from("urls")
    .select("user_id")
    .eq("short_code", code)
    .single();

  if (!existing) {
    return c.json({ error: "Link not found" }, 404);
  }

  if (existing.user_id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { error } = await supabase
    .from("urls")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("short_code", code);

  if (error) {
    return c.json({ error: "Failed to deactivate link" }, 500);
  }

  // Invalidate cache
  c.executionCtx.waitUntil(deleteCachedUrl(c.env.URL_CACHE, code));

  return c.json({ success: true });
});

export default links;
