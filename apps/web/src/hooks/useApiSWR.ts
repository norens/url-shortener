"use client";

import useSWR from "swr";
import type { SWRResponse } from "swr";
import { apiGet } from "@/lib/api";

export function useApiSWR<T>(path: string | null): SWRResponse<T> {
  return useSWR<T>(path, (url: string) => apiGet<T>(url));
}
