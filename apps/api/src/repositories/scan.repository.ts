import type { createSupabaseClient } from "../lib/supabase";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export async function insertScan(
  supabase: SupabaseClient,
  scan: {
    short_code: string;
    country: string | null;
    city: string | null;
    user_agent: string | null;
    referer: string | null;
    device_type: string;
  },
) {
  return supabase.from("url_scans").insert(scan);
}

export async function findByCodeSince(
  supabase: SupabaseClient,
  code: string,
  sinceDate: Date | null,
) {
  let query = supabase
    .from("url_scans")
    .select("*")
    .eq("short_code", code)
    .order("scanned_at", { ascending: false });

  if (sinceDate) {
    query = query.gte("scanned_at", sinceDate.toISOString());
  }

  return query;
}

export async function countUserMonthlyClicks(
  supabase: SupabaseClient,
  userId: string,
  monthStart: Date,
) {
  return supabase.rpc("count_user_monthly_clicks", {
    p_user_id: userId,
    p_month_start: monthStart.toISOString(),
  });
}
