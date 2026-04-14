"use client";

import type { AnalyticsResponse, LinkWithClicks } from "@qurl/shared";
import { ArrowLeft, Check, Clock, Copy } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { CountryList } from "@/components/analytics/CountryList";
import { DeviceBreakdown } from "@/components/analytics/DeviceBreakdown";
import { PeriodSelector } from "@/components/analytics/PeriodSelector";
import { RecentScans } from "@/components/analytics/RecentScans";
import { EditLinkForm } from "@/components/EditLinkForm";
import { useApiSWR } from "@/hooks/useApiSWR";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

const SHORT_URL_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export default function LinkDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { copied, copy } = useCopyToClipboard();
  const [period, setPeriod] = useState("7d");

  const shortUrl = `${SHORT_URL_BASE}/${code}`;

  const {
    data: analytics,
    isLoading: analyticsLoading,
    mutate: mutateAnalytics,
  } = useApiSWR<AnalyticsResponse>(`/api/analytics/${code}?period=${period}`);

  const { data: linksData, mutate: mutateLinks } = useApiSWR<{
    data: LinkWithClicks[];
  }>(`/api/links?search=${code}&per_page=1`);

  const link = linksData?.data?.[0];

  function handleUpdated() {
    mutateAnalytics();
    mutateLinks();
  }

  if (analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/links"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {link?.title ?? code}
            </h1>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                link?.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {link?.is_active ? "Active" : "Inactive"}
            </span>
            {link?.expires_at && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-950 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                <Clock className="h-3 w-3" />
                Expires{" "}
                {new Date(link.expires_at).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            <button
              type="button"
              onClick={() => copy(shortUrl)}
              className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {copied === shortUrl ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {shortUrl}
            </button>
          </div>
          {link && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate max-w-lg">
              {link.long_url}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6">
          {analytics?.period_clicks != null && (
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {analytics.period_clicks.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                period clicks
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {analytics?.total_clicks.toLocaleString() ?? 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              total clicks
            </p>
          </div>
        </div>
      </div>

      <PeriodSelector value={period} onChange={setPeriod} />

      {analytics && (
        <ClicksChart data={analytics.daily_clicks} period={period} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {analytics && <CountryList data={analytics.top_countries} />}
        {analytics && <DeviceBreakdown devices={analytics.devices} />}
      </div>

      {analytics && <RecentScans scans={analytics.recent_scans} />}

      {link && (
        <EditLinkForm
          shortCode={code}
          initialUrl={link.long_url}
          initialTitle={link.title}
          isActive={link.is_active}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
