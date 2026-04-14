import type { createSupabaseClient } from "../lib/supabase";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

const ALLOWED_SORT_COLUMNS = [
  "created_at",
  "updated_at",
  "short_code",
  "long_url",
  "title",
] as const;

export async function findForRedirect(supabase: SupabaseClient, code: string) {
  return supabase
    .from("urls")
    .select("long_url, expires_at, is_active, user_id")
    .eq("short_code", code)
    .single();
}

export async function findWithOwnership(
  supabase: SupabaseClient,
  code: string,
) {
  return supabase
    .from("urls")
    .select("user_id, created_at")
    .eq("short_code", code)
    .single();
}

export async function countByUser(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("urls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
}

export async function codeExists(supabase: SupabaseClient, code: string) {
  const { data } = await supabase
    .from("urls")
    .select("short_code")
    .eq("short_code", code)
    .single();
  return !!data;
}

export async function insert(
  supabase: SupabaseClient,
  row: {
    user_id: string | null;
    short_code: string;
    long_url: string;
    title?: string | null;
    expires_at?: string | null;
  },
) {
  return supabase.from("urls").insert(row).select().single();
}

export async function update(
  supabase: SupabaseClient,
  code: string,
  updates: Record<string, unknown>,
) {
  return supabase
    .from("urls")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("short_code", code)
    .select()
    .single();
}

export async function deactivate(supabase: SupabaseClient, code: string) {
  return supabase
    .from("urls")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("short_code", code);
}

export interface ListOptions {
  page: number;
  perPage: number;
  search: string;
  sort: string;
  ascending: boolean;
}

export async function listPaginated(
  supabase: SupabaseClient,
  userId: string,
  opts: ListOptions,
) {
  const offset = (opts.page - 1) * opts.perPage;
  const sortColumn = (ALLOWED_SORT_COLUMNS as readonly string[]).includes(
    opts.sort,
  )
    ? opts.sort
    : "created_at";

  let query = supabase
    .from("urls")
    .select(
      "id, short_code, long_url, title, is_active, expires_at, created_at, updated_at, click_totals(total_clicks)",
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (opts.search) {
    query = query.or(
      `long_url.ilike.%${opts.search}%,title.ilike.%${opts.search}%,short_code.ilike.%${opts.search}%`,
    );
  }

  query = query
    .order(sortColumn, { ascending: opts.ascending })
    .range(offset, offset + opts.perPage - 1);

  return query;
}
