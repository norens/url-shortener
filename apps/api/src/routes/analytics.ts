import type { AnalyticsPeriod, AnalyticsResponse } from "@qurl/shared";
import { PERIOD_DAYS, PLAN_LIMITS } from "@qurl/shared";
import { Hono } from "hono";
import type { Env } from "../types";
import { createSupabaseClient } from "../lib/supabase";

const VALID_PERIODS: AnalyticsPeriod[] = [
  "24h",
  "7d",
  "30d",
  "90d",
  "365d",
  "all",
];

/**
 * Given a requested period and the plan's analytics_retention_days,
 * return the most generous period the plan allows.
 * If retention is -1 (unlimited), the requested period is returned as-is.
 */
function clampPeriodToPlan(
  requested: AnalyticsPeriod,
  retentionDays: number,
): AnalyticsPeriod {
  if (retentionDays === -1) {
    return requested;
  }

  const requestedDays = PERIOD_DAYS[requested];

  // 'all' has null days — clamp to the largest period within retention
  if (requestedDays === null || requestedDays > retentionDays) {
    // Find the largest period that fits within retention
    const allowed = VALID_PERIODS.filter((p) => {
      const days = PERIOD_DAYS[p];
      return days !== null && days <= retentionDays;
    });
    // Periods are ordered smallest to largest in VALID_PERIODS, pick the last
    return allowed.length > 0 ? allowed[allowed.length - 1] : "7d";
  }

  return requested;
}

/**
 * Compute the "since" Date for a given period.
 * Returns null for 'all' (no lower bound).
 */
function computeSinceDate(period: AnalyticsPeriod): Date | null {
  const now = new Date();

  switch (period) {
    case "24h": {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
    case "365d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 365);
      return d;
    }
    case "all": {
      return null;
    }
  }
}

/**
 * Build the time-series buckets for daily_clicks.
 * - 24h: 24 hourly buckets (format YYYY-MM-DDTHH)
 * - 7d/30d/90d/365d: daily buckets (format YYYY-MM-DD)
 * - all: daily buckets from the earliest scan to today
 */
function buildBuckets(
  period: AnalyticsPeriod,
  linkCreatedAt: Date,
  scans: { scanned_at: string }[],
): Map<string, number> {
  const map = new Map<string, number>();
  const now = new Date();

  if (period === "24h") {
    // Hourly buckets — clamp start to link creation
    const periodStart = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    const start = linkCreatedAt > periodStart ? linkCreatedAt : periodStart;
    const startHour = new Date(start);
    startHour.setMinutes(0, 0, 0);

    const cursor = new Date(startHour);
    while (cursor <= now) {
      const key = cursor.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      map.set(key, 0);
      cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
    }
  } else {
    // Daily buckets — compute period start, then clamp to link creation
    let periodStart: Date;
    const days = PERIOD_DAYS[period];

    if (days !== null) {
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - (days - 1));
    } else {
      // 'all': start from earliest scan or link creation
      if (scans.length > 0) {
        const earliest = scans.reduce(
          (min, s) => (s.scanned_at < min ? s.scanned_at : min),
          scans[0].scanned_at,
        );
        periodStart = new Date(earliest);
      } else {
        periodStart = new Date(linkCreatedAt);
      }
    }

    // Clamp: don't show days before the link existed
    const start = linkCreatedAt > periodStart ? linkCreatedAt : periodStart;
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setUTCHours(0, 0, 0, 0);

    const cursor = new Date(start);
    while (cursor <= end) {
      map.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    // Ensure at least today is present
    if (map.size === 0) {
      map.set(now.toISOString().slice(0, 10), 0);
    }
  }

  return map;
}

const analytics = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

analytics.get("/api/analytics/:code", async (c) => {
  const userId = c.get("userId");
  const code = c.req.param("code");

  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Verify ownership and get creation date
  const { data: url } = await supabase
    .from("urls")
    .select("user_id, created_at")
    .eq("short_code", code)
    .single();

  if (!url) {
    return c.json({ error: "Link not found" }, 404);
  }

  if (url.user_id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // --- Parse and validate period query parameter ---
  const rawPeriod = c.req.query("period");
  const requestedPeriod: AnalyticsPeriod =
    rawPeriod && VALID_PERIODS.includes(rawPeriod as AnalyticsPeriod)
      ? (rawPeriod as AnalyticsPeriod)
      : "7d";

  // --- Fetch user plan for retention clamping ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = (profile?.plan as keyof typeof PLAN_LIMITS) ?? "free";
  const retentionDays = PLAN_LIMITS[plan].analytics_retention_days;

  const period = clampPeriodToPlan(requestedPeriod, retentionDays);

  // --- Compute date range ---
  const sinceDate = computeSinceDate(period);

  // Get total clicks (all-time)
  const { data: clickTotal } = await supabase
    .from("click_totals")
    .select("total_clicks")
    .eq("short_code", code)
    .single();

  // Get scans for the selected period
  let scansQuery = supabase
    .from("url_scans")
    .select("*")
    .eq("short_code", code)
    .order("scanned_at", { ascending: false });

  if (sinceDate) {
    scansQuery = scansQuery.gte("scanned_at", sinceDate.toISOString());
  }

  const { data: scans } = await scansQuery;
  const allScans = scans ?? [];

  // --- Build time-series buckets ---
  const linkCreatedAt = new Date(url.created_at);
  const dailyMap = buildBuckets(period, linkCreatedAt, allScans);

  for (const scan of allScans) {
    if (period === "24h") {
      // Group by hour: YYYY-MM-DDTHH
      const key = scan.scanned_at.slice(0, 13);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      }
    } else {
      // Group by day: YYYY-MM-DD
      const key = scan.scanned_at.slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      }
    }
  }

  const dailyClicks = Array.from(dailyMap.entries())
    .map(([date, clicks]) => ({ date, clicks }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Today's clicks
  const today = new Date().toISOString().slice(0, 10);
  const clicksToday =
    period === "24h"
      ? // Sum all hourly buckets that fall on today
        Array.from(dailyMap.entries())
          .filter(([key]) => key.startsWith(today))
          .reduce((sum, [, v]) => sum + v, 0)
      : (dailyMap.get(today) ?? 0);

  // Period clicks — total scans in the selected period
  const periodClicks = allScans.length;

  // Top countries
  const countryMap = new Map<string, number>();
  for (const scan of allScans) {
    if (scan.country) {
      countryMap.set(scan.country, (countryMap.get(scan.country) ?? 0) + 1);
    }
  }
  const topCountries = Array.from(countryMap.entries())
    .map(([country, clicks]) => ({ country, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Top cities
  const cityMap = new Map<string, number>();
  for (const scan of allScans) {
    if (scan.city) {
      cityMap.set(scan.city, (cityMap.get(scan.city) ?? 0) + 1);
    }
  }
  const topCities = Array.from(cityMap.entries())
    .map(([city, clicks]) => ({ city, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Device breakdown
  const devices = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
  for (const scan of allScans) {
    const dt = scan.device_type as keyof typeof devices;
    if (dt in devices) {
      devices[dt]++;
    } else {
      devices.unknown++;
    }
  }

  // Recent scans
  const recentScans = allScans.slice(0, 10);

  const response: AnalyticsResponse = {
    short_code: code,
    total_clicks: clickTotal?.total_clicks ?? 0,
    clicks_today: clicksToday,
    daily_clicks: dailyClicks,
    top_countries: topCountries,
    top_cities: topCities,
    devices,
    recent_scans: recentScans,
    period,
    period_clicks: periodClicks,
  };

  return c.json(response);
});

export default analytics;
