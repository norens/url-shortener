import Link from "next/link";
import { Link2, BarChart3, Zap, QrCode } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-gray-900">Qurl</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Shorten links.
          <br />
          <span className="text-blue-600">Track everything.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Create short, memorable links with powerful analytics. See who clicks,
          where they come from, and what devices they use — all in real time.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
          >
            Start for Free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            A complete URL management platform for individuals and teams.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Link2 className="h-6 w-6" />}
              title="Short Links"
              description="Create branded short links with custom aliases. Every link gets a unique 7-character code."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Analytics"
              description="Track clicks, locations, devices, and referrers. See 7-day charts and real-time data."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Fast Redirects"
              description="Sub-50ms redirects from 300+ edge locations worldwide via Cloudflare Workers."
            />
            <FeatureCard
              icon={<QrCode className="h-6 w-6" />}
              title="QR Codes"
              description="Generate customizable QR codes for every link. Change destination without reprinting."
              badge="Coming Soon"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to shorten your links?
          </h2>
          <p className="mt-4 text-gray-600">
            Free plan includes 25 links with full analytics. No credit card
            required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          Qurl — URL Shortener
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
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
        {badge && (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}
