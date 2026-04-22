import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase — qr route queries urls table via findForRedirect
type UrlRow = {
  long_url: string;
  expires_at: string | null;
  is_active: boolean;
  user_id: string | null;
};

let mockUrlRow: UrlRow | null = null;
let findForRedirectCalls = 0;

vi.mock("../lib/supabase", () => ({
  createSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "urls") {
        return {
          select: () => ({
            eq: () => ({
              single: () => {
                findForRedirectCalls++;
                if (mockUrlRow) {
                  return Promise.resolve({ data: mockUrlRow, error: null });
                }
                return Promise.resolve({
                  data: null,
                  error: { code: "PGRST116" },
                });
              },
            }),
          }),
        };
      }
      return {
        insert: () => Promise.resolve({ error: null }),
      };
    },
    rpc: () => Promise.resolve({ error: null }),
  }),
}));

// Spy on qrforge so we can inspect payload and avoid coupling tests to SVG bytes
const generateSvgSpy = vi.fn((config: { payload: { data: string } }) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><!--${config.payload.data}--></svg>`;
});
const buildUrlPayloadSpy = vi.fn((url: string) => ({
  type: "url" as const,
  data: url,
}));

vi.mock("@nazarf/qrforge", () => ({
  generateSvg: (cfg: unknown) => generateSvgSpy(cfg as never),
  buildUrlPayload: (url: string, opts?: unknown) =>
    buildUrlPayloadSpy(url, opts as never),
}));

import worker from "../index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function clearKv() {
  for (const prefix of ["url:", "rl:", "qr:"]) {
    const keys = await env.URL_CACHE.list({ prefix });
    for (const key of keys.keys) {
      await env.URL_CACHE.delete(key.name);
    }
  }
}

describe("GET /api/qr/:code.svg", () => {
  beforeEach(async () => {
    await clearKv();
    mockUrlRow = null;
    findForRedirectCalls = 0;
    generateSvgSpy.mockClear();
    buildUrlPayloadSpy.mockClear();
  });

  it("returns 404 when code doesn't exist", async () => {
    const request = new IncomingRequest("http://localhost/api/qr/missing.svg");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json<{ error: string }>();
    expect(body.error).toBeDefined();
  });

  it("returns 404 when URL is inactive", async () => {
    mockUrlRow = {
      long_url: "https://example.com/target",
      expires_at: null,
      is_active: false,
      user_id: null,
    };

    const request = new IncomingRequest("http://localhost/api/qr/inact.svg");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
  });

  it("returns 404 when URL is expired", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    mockUrlRow = {
      long_url: "https://example.com/target",
      expires_at: past,
      is_active: true,
      user_id: null,
    };

    const request = new IncomingRequest("http://localhost/api/qr/expired.svg");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
  });

  it("returns 200 with valid SVG on happy path", async () => {
    mockUrlRow = {
      long_url: "https://example.com/target",
      expires_at: null,
      is_active: true,
      user_id: null,
    };

    const request = new IncomingRequest("http://localhost/api/qr/abc1234.svg");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toContain("max-age=3600");
    expect(response.headers.get("x-qurl-qr")).toBe("default");

    const body = await response.text();
    expect(body.startsWith("<svg")).toBe(true);
    expect(body.endsWith("</svg>")).toBe(true);
    expect(body).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("encodes the short URL with ?qrs=1 in the QR payload", async () => {
    mockUrlRow = {
      long_url: "https://example.com/target",
      expires_at: null,
      is_active: true,
      user_id: null,
    };

    const request = new IncomingRequest("http://localhost/api/qr/abc.svg");
    const ctx = createExecutionContext();
    await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(buildUrlPayloadSpy).toHaveBeenCalledTimes(1);
    const encoded = buildUrlPayloadSpy.mock.calls[0]?.[0] as string;
    expect(encoded).toContain("/abc");
    expect(encoded).toContain("qrs=1");
  });

  it("caches on cold read and serves from cache on warm read", async () => {
    mockUrlRow = {
      long_url: "https://example.com/target",
      expires_at: null,
      is_active: true,
      user_id: null,
    };

    // Cold read
    {
      const request = new IncomingRequest("http://localhost/api/qr/warm.svg");
      const ctx = createExecutionContext();
      const res = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      expect(res.status).toBe(200);
    }
    const coldCalls = findForRedirectCalls;
    const coldSvgCalls = generateSvgSpy.mock.calls.length;
    expect(coldCalls).toBeGreaterThan(0);
    expect(coldSvgCalls).toBe(1);

    // Warm read — should hit KV, not repo or qrforge
    {
      const request = new IncomingRequest("http://localhost/api/qr/warm.svg");
      const ctx = createExecutionContext();
      const res = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/svg+xml");
    }
    expect(findForRedirectCalls).toBe(coldCalls);
    expect(generateSvgSpy.mock.calls.length).toBe(coldSvgCalls);
  });

  it("returns 400 on malformed code", async () => {
    const request = new IncomingRequest("http://localhost/api/qr/!!!.svg");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json<{ error: string }>();
    expect(body.error).toBe("invalid_code");
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockUrlRow = {
      long_url: "https://example.com/target",
      expires_at: null,
      is_active: true,
      user_id: null,
    };

    const ip = "203.0.113.42";
    // Rate limit is 300/hr; simulate the limiter being near-maxed by
    // pre-populating the KV entry directly (faster than firing 300 requests).
    const key = `rl:qr-svg:${ip}`;
    await env.URL_CACHE.put(
      key,
      JSON.stringify({
        count: 300,
        expiresAt: Date.now() + 3600 * 1000,
      }),
      { expirationTtl: 3600 },
    );

    const request = new IncomingRequest("http://localhost/api/qr/abc.svg", {
      headers: { "cf-connecting-ip": ip },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(429);
    const body = await response.json<{ error: string }>();
    expect(body.error).toBeDefined();
  });

  it("returns 404 when URL is missing the .svg suffix", async () => {
    const request = new IncomingRequest("http://localhost/api/qr/abc");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
  });
});
