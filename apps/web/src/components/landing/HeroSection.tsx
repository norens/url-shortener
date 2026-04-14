"use client";

import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

interface ShortenResult {
  short_code: string;
  short_url: string;
  expires_at: string;
  original_url: string;
}

export function HeroSection() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShortenResult | null>(null);
  const { copied, copy } = useCopyToClipboard();

  const handleShorten = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setResult(null);
      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/api/shorten/anonymous`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Something went wrong (${res.status})`);
        }

        const data = await res.json();
        setResult({ ...data, original_url: url });
        setUrl("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to shorten URL");
      } finally {
        setLoading(false);
      }
    },
    [url],
  );

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 sm:pt-32">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-600 dark:text-violet-400 mb-4">
          Free & Open Source
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Shorten any URL in seconds
        </h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          Free, fast, and open source. Create short links with analytics powered
          by Cloudflare&apos;s edge network.
        </p>
      </div>

      {/* Shortening form */}
      <form onSubmit={handleShorten} className="mx-auto mt-10 max-w-xl">
        <div className="flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/your-long-url"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-gray-500 dark:focus:ring-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Shorten
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </form>

      {/* Result */}
      {result && (
        <div className="mx-auto mt-6 max-w-xl rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            <a
              href={result.short_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900 hover:underline dark:text-gray-100"
            >
              {result.short_url}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </a>
            <button
              type="button"
              onClick={() => copy(result.short_url)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {copied === result.short_url ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">
            {result.original_url}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Expires in 7 days
            </span>
            <Link
              href="/signup"
              className="text-xs font-medium text-gray-900 hover:underline dark:text-gray-100"
            >
              Sign up to save and manage your links
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
