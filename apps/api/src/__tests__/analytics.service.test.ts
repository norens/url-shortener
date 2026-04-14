import { describe, expect, it } from "vitest";
import {
  buildBuckets,
  clampPeriodToPlan,
  computeSinceDate,
} from "../services/analytics.service";

describe("computeSinceDate", () => {
  it('returns null for "all" period', () => {
    expect(computeSinceDate("all")).toBeNull();
  });

  it('returns a Date ~24h ago for "24h"', () => {
    const result = computeSinceDate("24h");
    expect(result).toBeInstanceOf(Date);
    const diffMs = Date.now() - result!.getTime();
    // Should be approximately 1 day (86400000 ms), allow 1 second tolerance
    expect(diffMs).toBeGreaterThan(86400000 - 1000);
    expect(diffMs).toBeLessThan(86400000 + 1000);
  });

  it('returns a Date ~7 days ago for "7d"', () => {
    const result = computeSinceDate("7d");
    expect(result).toBeInstanceOf(Date);
    const diffMs = Date.now() - result!.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(diffMs).toBeGreaterThan(sevenDaysMs - 1000);
    expect(diffMs).toBeLessThan(sevenDaysMs + 1000);
  });

  it('returns a Date ~30 days ago for "30d"', () => {
    const result = computeSinceDate("30d");
    expect(result).toBeInstanceOf(Date);
    const diffMs = Date.now() - result!.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(diffMs).toBeGreaterThan(thirtyDaysMs - 1000);
    expect(diffMs).toBeLessThan(thirtyDaysMs + 1000);
  });
});

describe("clampPeriodToPlan", () => {
  it("returns requested period when retention is -1 (unlimited)", () => {
    expect(clampPeriodToPlan("all", -1)).toBe("all");
    expect(clampPeriodToPlan("365d", -1)).toBe("365d");
    expect(clampPeriodToPlan("7d", -1)).toBe("7d");
  });

  it('clamps "all" to "30d" when retention is 30', () => {
    expect(clampPeriodToPlan("all", 30)).toBe("30d");
  });

  it('returns "7d" unchanged when retention is 30', () => {
    expect(clampPeriodToPlan("7d", 30)).toBe("7d");
  });

  it('clamps "365d" to "90d" when retention is 90', () => {
    expect(clampPeriodToPlan("365d", 90)).toBe("90d");
  });
});

describe("buildBuckets", () => {
  it('creates hourly buckets for "24h" period', () => {
    const linkCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago
    const buckets = buildBuckets("24h", linkCreatedAt, []);

    // Should have up to 24 hourly buckets
    expect(buckets.size).toBeGreaterThan(0);
    expect(buckets.size).toBeLessThanOrEqual(25); // 24 hours + possible partial

    // All keys should be in YYYY-MM-DDTHH format
    for (const key of buckets.keys()) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}$/);
    }

    // All values should be 0 (no scans provided)
    for (const value of buckets.values()) {
      expect(value).toBe(0);
    }
  });

  it('creates daily buckets for "7d" period', () => {
    const linkCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const buckets = buildBuckets("7d", linkCreatedAt, []);

    // Should have 7 daily buckets
    expect(buckets.size).toBe(7);

    // All keys should be in YYYY-MM-DD format
    for (const key of buckets.keys()) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("clamps buckets to link creation date", () => {
    // Link created 3 days ago, but requesting 7d
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setUTCHours(0, 0, 0, 0);

    const buckets = buildBuckets("7d", threeDaysAgo, []);

    // Should have 4 days (3 days ago, 2 days ago, yesterday, today)
    expect(buckets.size).toBe(4);

    // First bucket date should be the link creation date
    const firstKey = Array.from(buckets.keys())[0];
    expect(firstKey).toBe(threeDaysAgo.toISOString().slice(0, 10));
  });
});
