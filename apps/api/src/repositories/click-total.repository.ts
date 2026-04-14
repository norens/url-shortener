import type { createSupabaseClient } from "../lib/supabase";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export async function findByCode(supabase: SupabaseClient, code: string) {
  return supabase
    .from("click_totals")
    .select("total_clicks")
    .eq("short_code", code)
    .single();
}

export async function increment(supabase: SupabaseClient, code: string) {
  return supabase.rpc("increment_clicks", { code });
}
