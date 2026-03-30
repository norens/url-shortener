import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase client before importing the worker
vi.mock("../lib/supabase", () => ({
  createSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: null, error: { code: "PGRST116" } }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                short_code: "abc1234",
                long_url: "https://example.com",
                title: null,
                created_at: new Date().toISOString(),
                expires_at: null,
              },
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

// Mock codegen to return predictable codes
vi.mock("../lib/codegen", () => ({
  generateShortCode: () => "abc1234",
}));

import worker from "../index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("POST /api/shorten/anonymous", () => {
  beforeEach(async () => {
    // Clear any rate limit entries from KV before each test
    const keys = await env.URL_CACHE.list({ prefix: "rl:" });
    for (const key of keys.keys) {
      await env.URL_CACHE.delete(key.name);
    }
  });

  it("returns 201 with short_code, short_url, and expires_at for a valid URL", async () => {
    const request = new IncomingRequest(
      "http://localhost/api/shorten/anonymous",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      },
    );

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);

    const body = await response.json<{
      short_code: string;
      short_url: string;
      long_url: string;
      expires_at: string;
    }>();

    expect(body.short_code).toBe("abc1234");
    expect(body.short_url).toContain("abc1234");
    expect(body.long_url).toBe("https://example.com");
    expect(body.expires_at).toBeDefined();
  });

  it("returns 400 for a missing url field", async () => {
    const request = new IncomingRequest(
      "http://localhost/api/shorten/anonymous",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "" }),
      },
    );

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
  });

  it("returns 400 for an empty body", async () => {
    const request = new IncomingRequest(
      "http://localhost/api/shorten/anonymous",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-http URL (e.g. ftp://)", async () => {
    const request = new IncomingRequest(
      "http://localhost/api/shorten/anonymous",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "ftp://files.example.com/data.zip" }),
      },
    );

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
  });
});
