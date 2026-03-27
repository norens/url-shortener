import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseClient } from "../lib/supabase";
import type { AnalyticsResponse } from "@qurl/shared";

const analytics = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

analytics.get("/api/analytics/:code", async (c) => {
  const userId = c.get("userId");
  const code = c.req.param("code");

  const supabase = createSupabaseClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify ownership
  const { data: url } = await supabase
    .from("urls")
    .select("user_id")
    .eq("short_code", code)
    .single();

  if (!url) {
    return c.json({ error: "Link not found" }, 404);
  }

  if (url.user_id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Get total clicks
  const { data: clickTotal } = await supabase
    .from("click_totals")
    .select("total_clicks")
    .eq("short_code", code)
    .single();

  // Get scans from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: scans } = await supabase
    .from("url_scans")
    .select("*")
    .eq("short_code", code)
    .gte("scanned_at", sevenDaysAgo.toISOString())
    .order("scanned_at", { ascending: false });

  const allScans = scans ?? [];

  // Compute daily clicks
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const scan of allScans) {
    const date = scan.scanned_at.slice(0, 10);
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
  }
  const dailyClicks = Array.from(dailyMap.entries())
    .map(([date, clicks]) => ({ date, clicks }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Today's clicks
  const today = new Date().toISOString().slice(0, 10);
  const clicksToday = dailyMap.get(today) ?? 0;

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
  };

  return c.json(response);
});

export default analytics;
