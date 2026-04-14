import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit } from "../repositories/cache.repository";

describe("checkRateLimit", () => {
  const TEST_USER = "test-user-ratelimit";
  const LIMIT = 3;
  const WINDOW_SECONDS = 60;

  beforeEach(async () => {
    // Clear rate limit entries before each test
    const keys = await env.URL_CACHE.list({ prefix: "rl:" });
    for (const key of keys.keys) {
      await env.URL_CACHE.delete(key.name);
    }
  });

  it("allows the first request", async () => {
    const result = await checkRateLimit(
      env.URL_CACHE,
      TEST_USER,
      LIMIT,
      WINDOW_SECONDS,
    );

    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it("allows requests up to the limit", async () => {
    // Make requests up to the limit
    for (let i = 0; i < LIMIT; i++) {
      const result = await checkRateLimit(
        env.URL_CACHE,
        TEST_USER,
        LIMIT,
        WINDOW_SECONDS,
      );
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests that exceed the limit", async () => {
    // Exhaust the limit
    for (let i = 0; i < LIMIT; i++) {
      await checkRateLimit(env.URL_CACHE, TEST_USER, LIMIT, WINDOW_SECONDS);
    }

    // Next request should be blocked
    const result = await checkRateLimit(
      env.URL_CACHE,
      TEST_USER,
      LIMIT,
      WINDOW_SECONDS,
    );
    expect(result.allowed).toBe(false);
  });

  it("returns retryAfter when rate limited", async () => {
    // Exhaust the limit
    for (let i = 0; i < LIMIT; i++) {
      await checkRateLimit(env.URL_CACHE, TEST_USER, LIMIT, WINDOW_SECONDS);
    }

    // Next request should have retryAfter
    const result = await checkRateLimit(
      env.URL_CACHE,
      TEST_USER,
      LIMIT,
      WINDOW_SECONDS,
    );
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(WINDOW_SECONDS);
  });

  it("uses separate counters for different users", async () => {
    // Exhaust limit for user A
    for (let i = 0; i < LIMIT; i++) {
      await checkRateLimit(env.URL_CACHE, "user-a", LIMIT, WINDOW_SECONDS);
    }
    const blockedA = await checkRateLimit(
      env.URL_CACHE,
      "user-a",
      LIMIT,
      WINDOW_SECONDS,
    );
    expect(blockedA.allowed).toBe(false);

    // User B should still be allowed
    const allowedB = await checkRateLimit(
      env.URL_CACHE,
      "user-b",
      LIMIT,
      WINDOW_SECONDS,
    );
    expect(allowedB.allowed).toBe(true);
  });
});
