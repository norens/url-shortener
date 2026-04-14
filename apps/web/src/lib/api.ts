import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `API error: ${res.status}`);
  }

  // Handle 204 No Content and similar
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>("GET", path);
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>("POST", path, data);
}

export async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>("PATCH", path, data);
}

export async function apiDelete(path: string): Promise<void> {
  return apiFetch<void>("DELETE", path);
}
