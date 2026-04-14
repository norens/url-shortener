import type { createSupabaseClient } from "../lib/supabase";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export async function findPlanAndLimit(
  supabase: SupabaseClient,
  userId: string,
) {
  return supabase
    .from("profiles")
    .select("plan, links_limit")
    .eq("id", userId)
    .single();
}

export async function findPlan(supabase: SupabaseClient, userId: string) {
  return supabase.from("profiles").select("plan").eq("id", userId).single();
}
