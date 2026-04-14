import type { createSupabaseClient } from "./lib/supabase";

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  URL_CACHE: KVNamespace;
  ENVIRONMENT: string;
};

export type Deps = {
  supabase: ReturnType<typeof createSupabaseClient>;
  kv: KVNamespace;
};

export const CF_HEADERS = {
  COUNTRY: "cf-ipcountry",
  CITY: "cf-ipcity",
  CONNECTING_IP: "cf-connecting-ip",
} as const;
