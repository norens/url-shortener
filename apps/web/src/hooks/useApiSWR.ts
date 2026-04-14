"use client";

import type { SWRResponse } from "swr";
import useSWR from "swr";
import { apiGet } from "@/lib/api";

export function useApiSWR<T>(path: string | null): SWRResponse<T> {
  return useSWR<T>(path, (url: string) => apiGet<T>(url));
}
