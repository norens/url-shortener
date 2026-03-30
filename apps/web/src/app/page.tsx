"use client";

import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Link2,
  Loader2,
  QrCode,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

interface ShortenResult {
  short_code: string;
  short_url: string;
  expires_at: string;
  original_url: string;
}

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Qurl
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 sm:pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            Shorten any URL in seconds
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Free, fast, and open source. Create short links with analytics
            powered by Cloudflare&apos;s edge network.
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
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Shorten
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
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
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {copied ? (
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

      {/* Features */}
      <section className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Everything you need
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Link2 className="h-5 w-5" />}
              title="Short Links"
              description="Custom aliases and memorable 7-character codes for every link."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Analytics"
              description="Track clicks, locations, devices, and referrers in real time."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Fast Redirects"
              description="Sub-50ms redirects from 300+ Cloudflare edge locations."
            />
            <FeatureCard
              icon={<QrCode className="h-5 w-5" />}
              title="QR Codes"
              description="Generate QR codes for any link. Change destination without reprinting."
              badge="Coming Soon"
            />
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Simple pricing
          </h2>
          <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            Start free. Upgrade when you need more.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {/* Free */}
            <div className="relative rounded-xl border-2 border-gray-900 bg-white p-6 dark:border-gray-100 dark:bg-gray-900">
              <span className="absolute -top-3 left-4 rounded-full bg-gray-900 px-3 py-0.5 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900">
                Most popular
              </span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Free
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                For personal use
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
                <PlanItem>20 links</PlanItem>
                <PlanItem>10K clicks / month</PlanItem>
                <PlanItem>30-day analytics</PlanItem>
              </ul>
              <Link
                href="/signup"
                className="mt-6 block w-full rounded-lg bg-gray-900 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Pro
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                For growing projects
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
                <PlanItem>500 links</PlanItem>
                <PlanItem>100K clicks / month</PlanItem>
                <PlanItem>1-year analytics</PlanItem>
              </ul>
              <a
                href="mailto:nazarfedisin@gmail.com"
                className="mt-6 block w-full rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Contact Us
              </a>
            </div>

            {/* Business */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Business
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                For teams at scale
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
                <PlanItem>Unlimited links</PlanItem>
                <PlanItem>Unlimited clicks</PlanItem>
                <PlanItem>Unlimited analytics</PlanItem>
              </ul>
              <a
                href="mailto:nazarfedisin@gmail.com"
                className="mt-6 block w-full rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-8 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:justify-between">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Qurl
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://ko-fi.com/nazarfedyshyn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Heart className="h-3.5 w-3.5" />
              Support Qurl on Ko-fi
            </a>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>Open Source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {icon}
        </div>
        {badge && (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function PlanItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      {children}
    </li>
  );
}
