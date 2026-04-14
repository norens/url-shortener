import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CF_HEADERS, type Env } from "../types";
import { createSupabaseClient } from "../lib/supabase";
import { shortenSchema, anonymousShortenSchema } from "../lib/validation";
import { createLink, createAnonymousLink } from "../services/link.service";

const shorten = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

shorten.post("/api/shorten", zValidator("json", shortenSchema), async (c) => {
  const userId = c.get("userId");
  const { long_url, alias, title, expires_at } = c.req.valid("json");

  const deps = {
    supabase: createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY),
    kv: c.env.URL_CACHE,
  };

  const result = await createLink(deps, { userId, long_url, alias, title, expires_at });
  c.executionCtx.waitUntil(result.cachePromise);

  return c.json(
    {
      short_code: result.short_code,
      short_url: result.short_url,
      long_url: result.long_url,
      title: result.title,
      created_at: result.created_at,
    },
    201,
  );
});

const anonymousShorten = new Hono<{ Bindings: Env }>();

anonymousShorten.post(
  "/api/shorten/anonymous",
  zValidator("json", anonymousShortenSchema),
  async (c) => {
    const { url } = c.req.valid("json");

    const deps = {
      supabase: createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY),
      kv: c.env.URL_CACHE,
    };

    const ip =
      c.req.header(CF_HEADERS.CONNECTING_IP) ||
      c.req.header("x-forwarded-for") ||
      "unknown";

    const result = await createAnonymousLink(deps, { url, ip });
    c.executionCtx.waitUntil(result.cachePromise);

    return c.json(
      {
        short_code: result.short_code,
        short_url: result.short_url,
        long_url: result.long_url,
        expires_at: result.expires_at,
      },
      201,
    );
  },
);

export { anonymousShorten };
export default shorten;
