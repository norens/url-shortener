"use client";

import { use } from "react";
import useSWR from "swr";
import { ArrowLeft, Copy, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { CountryList } from "@/components/analytics/CountryList";
import { DeviceBreakdown } from "@/components/analytics/DeviceBreakdown";
import { RecentScans } from "@/components/analytics/RecentScans";
import { EditLinkForm } from "@/components/EditLinkForm";
import type { AnalyticsResponse, LinkWithClicks } from "@qurl/shared";

const SHORT_URL_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export default function LinkDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [copied, setCopied] = useState(false);

  const {
    data: analytics,
    isLoading: analyticsLoading,
    mutate: mutateAnalytics,
  } = useSWR(`/api/analytics/${code}`, (url: string) =>
    apiGet<AnalyticsResponse>(url)
  );

  const {
    data: linksData,
    mutate: mutateLinks,
  } = useSWR(`/api/links?search=${code}&per_page=1`, (url: string) =>
    apiGet<{ data: LinkWithClicks[] }>(url)
  );

  const link = linksData?.data?.[0];

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(`${SHORT_URL_BASE}/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  function handleUpdated() {
    mutateAnalytics();
    mutateLinks();
  }

  if (analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/links"
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {link?.title ?? code}
            </h1>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-200"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {SHORT_URL_BASE}/{code}
            </button>
          </div>
          {link && (
            <p className="mt-1 text-sm text-gray-500 truncate max-w-lg">
              {link.long_url}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">
            {analytics?.total_clicks.toLocaleString() ?? 0}
          </p>
          <p className="text-sm text-gray-500">total clicks</p>
        </div>
      </div>

      {analytics && <ClicksChart data={analytics.daily_clicks} />}

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
