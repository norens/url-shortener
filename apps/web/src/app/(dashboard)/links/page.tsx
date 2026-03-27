"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Copy,
  Check,
  ExternalLink,
  BarChart3,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { CreateLinkDialog } from "@/components/CreateLinkDialog";
import type { PaginatedResponse, LinkWithClicks } from "@qurl/shared";

const SHORT_URL_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export default function LinksPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR(
    `/api/links?page=${page}&per_page=20&search=${search}`,
    (url: string) => apiGet<PaginatedResponse<LinkWithClicks>>(url)
  );

  const handleCopy = useCallback(async (shortCode: string) => {
    await navigator.clipboard.writeText(`${SHORT_URL_BASE}/${shortCode}`);
    setCopiedCode(shortCode);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Links</h1>
        <CreateLinkDialog onCreated={() => mutate()} />
      </div>

      <div>
        <input
          type="text"
          placeholder="Search links..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Link2Icon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            No links yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first short link to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Link
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Destination
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Clicks
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-600">
                        {link.short_code}
                      </span>
                      <button
                        onClick={() => handleCopy(link.short_code)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy short URL"
                      >
                        {copiedCode === link.short_code ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {link.title && (
                      <p className="text-xs text-gray-500">{link.title}</p>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600">
                    {link.long_url}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                    {link.total_clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        link.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {link.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/links/${link.short_code}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {data.page} of {data.total_pages} ({data.total} links)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= data.total_pages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Link2Icon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
      />
    </svg>
  );
}
