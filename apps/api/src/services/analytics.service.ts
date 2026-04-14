import type { AnalyticsPeriod, AnalyticsResponse, UrlScan } from "@qurl/shared";
import { PERIOD_DAYS, PLAN_LIMITS } from "@qurl/shared";
import { ForbiddenError, NotFoundError } from "../errors";
import * as clickTotalRepo from "../repositories/click-total.repository";
import * as profileRepo from "../repositories/profile.repository";
import * as scanRepo from "../repositories/scan.repository";
import * as urlRepo from "../repositories/url.repository";
import type { Deps } from "../types";

const VALID_PERIODS: AnalyticsPeriod[] = [
  "24h",
  "7d",
  "30d",
  "90d",
  "365d",
  "all",
];

// --- Helpers (exported for testing) ---

/**
 * Given a requested period and the plan's analytics_retention_days,
 * return the most generous period the plan allows.
 * If retention is -1 (unlimited), the requested period is returned as-is.
 */
export function clampPeriodToPlan(
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
export function computeSinceDate(period: AnalyticsPeriod): Date | null {
  const days = PERIOD_DAYS[period];
  if (days === null) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Build the time-series buckets for daily_clicks.
 * - 24h: 24 hourly buckets (format YYYY-MM-DDTHH)
 * - 7d/30d/90d/365d: daily buckets (format YYYY-MM-DD)
 * - all: daily buckets from the earliest scan to today
 */
export function buildBuckets(
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

/**
 * Generic helper to aggregate top values from scans by a given field.
 */
function aggregateTop(
  scans: Record<string, unknown>[],
  field: string,
  limit: number,
): { value: string; clicks: number }[] {
  const map = new Map<string, number>();
  for (const scan of scans) {
    const value = scan[field] as string | null;
    if (value) {
      map.set(value, (map.get(value) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([value, clicks]) => ({ value, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

// --- Public service function ---

export async function getAnalytics(
  deps: Deps,
  userId: string,
  code: string,
  requestedPeriod: string | undefined,
): Promise<AnalyticsResponse> {
  // Validate period
  const validatedPeriod: AnalyticsPeriod =
    requestedPeriod &&
    VALID_PERIODS.includes(requestedPeriod as AnalyticsPeriod)
      ? (requestedPeriod as AnalyticsPeriod)
      : "7d";

  // Verify ownership and get plan in parallel
  const [{ data: url }, { data: profile }] = await Promise.all([
    urlRepo.findWithOwnership(deps.supabase, code),
    profileRepo.findPlan(deps.supabase, userId),
  ]);

  if (!url) {
    throw new NotFoundError("Link not found");
  }

  if (url.user_id !== userId) {
    throw new ForbiddenError();
  }

  // Clamp period to plan retention
  const plan = (profile?.plan as keyof typeof PLAN_LIMITS) ?? "free";
  const retentionDays = PLAN_LIMITS[plan].analytics_retention_days;
  const period = clampPeriodToPlan(validatedPeriod, retentionDays);

  // Compute date range
  const sinceDate = computeSinceDate(period);

  // Get total clicks and scans in parallel
  const [{ data: clickTotal }, { data: scans }] = await Promise.all([
    clickTotalRepo.findByCode(deps.supabase, code),
    scanRepo.findByCodeSince(deps.supabase, code, sinceDate),
  ]);

  const allScans = scans ?? [];

  // Build time-series buckets
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

  // Top countries & cities
  const topCountries = aggregateTop(allScans, "country", 10).map(
    ({ value, clicks }) => ({ country: value, clicks }),
  );
  const topCities = aggregateTop(allScans, "city", 10).map(
    ({ value, clicks }) => ({ city: value, clicks }),
  );

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
  const recentScans = allScans.slice(0, 10) as UrlScan[];

  return {
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
}
