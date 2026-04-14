import { describe, expect, it, vi } from "vitest";

// Mock the repositories
vi.mock("../repositories/cache.repository", () => ({
  getCachedUrl: vi.fn(),
  setCachedUrl: vi.fn().mockResolvedValue(undefined),
  deleteCachedUrl: vi.fn().mockResolvedValue(undefined),
  checkRateLimit: vi.fn(),
}));

vi.mock("../repositories/url.repository", () => ({
  findForRedirect: vi.fn(),
  findWithOwnership: vi.fn(),
  codeExists: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  countByUser: vi.fn(),
  listPaginated: vi.fn(),
}));

vi.mock("../repositories/profile.repository", () => ({
  findPlan: vi.fn(),
  findPlanAndLimit: vi.fn(),
}));

vi.mock("../lib/codegen", () => ({
  generateShortCode: () => "abc1234",
}));

import * as cacheRepo from "../repositories/cache.repository";
import * as urlRepo from "../repositories/url.repository";
import { resolveLink } from "../services/link.service";
import { GoneError, NotFoundError } from "../errors";
import type { Deps } from "../types";

const mockDeps: Deps = {
  supabase: {} as any,
  kv: {} as any,
};

describe("resolveLink", () => {
  it("returns cached URL when found in KV", async () => {
    const cached = {
      long_url: "https://example.com",
      expires_at: null,
      is_active: true,
      user_id: "user-1",
    };
    vi.mocked(cacheRepo.getCachedUrl).mockResolvedValue(cached);

    const result = await resolveLink(mockDeps, "abc123");

    expect(result.cached).toEqual(cached);
    expect(result.cachePromise).toBeUndefined();
    expect(cacheRepo.getCachedUrl).toHaveBeenCalledWith(mockDeps.kv, "abc123");
    // Should not have called the DB
    expect(urlRepo.findForRedirect).not.toHaveBeenCalled();
  });

  it("falls back to DB when cache misses, caches result", async () => {
    vi.mocked(cacheRepo.getCachedUrl).mockResolvedValue(null);
    vi.mocked(urlRepo.findForRedirect).mockResolvedValue({
      data: {
        long_url: "https://example.com/db",
        expires_at: null,
        is_active: true,
        user_id: "user-2",
      },
      error: null,
    } as any);

    const result = await resolveLink(mockDeps, "dbcode");

    expect(result.cached.long_url).toBe("https://example.com/db");
    expect(urlRepo.findForRedirect).toHaveBeenCalledWith(
      mockDeps.supabase,
      "dbcode",
    );
    expect(cacheRepo.setCachedUrl).toHaveBeenCalledWith(
      mockDeps.kv,
      "dbcode",
      {
        long_url: "https://example.com/db",
        expires_at: null,
        is_active: true,
        user_id: "user-2",
      },
      null,
    );
  });

  it("throws NotFoundError when not found in DB", async () => {
    vi.mocked(cacheRepo.getCachedUrl).mockResolvedValue(null);
    vi.mocked(urlRepo.findForRedirect).mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    } as any);

    await expect(resolveLink(mockDeps, "missing")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws GoneError when link is deactivated", async () => {
    vi.mocked(cacheRepo.getCachedUrl).mockResolvedValue({
      long_url: "https://example.com",
      expires_at: null,
      is_active: false,
      user_id: null,
    });

    await expect(resolveLink(mockDeps, "inactive")).rejects.toThrow(GoneError);
    await expect(resolveLink(mockDeps, "inactive")).rejects.toThrow(
      "deactivated",
    );
  });

  it("throws GoneError when link is expired", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    vi.mocked(cacheRepo.getCachedUrl).mockResolvedValue({
      long_url: "https://example.com",
      expires_at: pastDate,
      is_active: true,
      user_id: null,
    });

    await expect(resolveLink(mockDeps, "expired")).rejects.toThrow(GoneError);
    await expect(resolveLink(mockDeps, "expired")).rejects.toThrow("expired");
  });
});
