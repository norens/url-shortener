import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase — redirect route queries urls table and tracks clicks
vi.mock("../lib/supabase", () => ({
  createSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "urls") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { code: "PGRST116" },
                }),
            }),
          }),
        };
      }
      // url_scans table (analytics insert)
      return {
        insert: () => Promise.resolve({ error: null }),
      };
    },
    rpc: () => Promise.resolve({ error: null }),
  }),
}));

import worker from "../index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("GET /:code (redirect)", () => {
  beforeEach(async () => {
    // Clear URL cache entries before each test
    const keys = await env.URL_CACHE.list({ prefix: "url:" });
    for (const key of keys.keys) {
      await env.URL_CACHE.delete(key.name);
    }
  });

  it("returns 302 redirect for a valid cached code", async () => {
    // Pre-populate the KV cache with a valid URL
    await env.URL_CACHE.put(
      "url:testcode",
      JSON.stringify({
        long_url: "https://example.com/destination",
        expires_at: null,
        is_active: true,
        user_id: null,
      }),
      { expirationTtl: 3600 },
    );

    const request = new IncomingRequest("http://localhost/testcode");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://example.com/destination",
    );
  });

  it("returns 404 for an unknown code (not in cache or DB)", async () => {
    const request = new IncomingRequest("http://localhost/nonexistent");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
  });

  it("returns 410 for a deactivated link", async () => {
    await env.URL_CACHE.put(
      "url:inactive",
      JSON.stringify({
        long_url: "https://example.com/old",
        expires_at: null,
        is_active: false,
        user_id: null,
      }),
      { expirationTtl: 3600 },
    );

    const request = new IncomingRequest("http://localhost/inactive");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(410);
    const body = await response.json<{ error: string }>();
    expect(body.error).toContain("deactivated");
  });

  it("returns 410 for an expired link", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    await env.URL_CACHE.put(
      "url:expired",
      JSON.stringify({
        long_url: "https://example.com/expired",
        expires_at: pastDate,
        is_active: true,
        user_id: null,
      }),
      { expirationTtl: 3600 },
    );

    const request = new IncomingRequest("http://localhost/expired");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(410);
    const body = await response.json<{ error: string }>();
    expect(body.error).toContain("expired");
  });
});
