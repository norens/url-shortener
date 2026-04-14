import { BarChart3, Link2, QrCode, Zap } from "lucide-react";

function FeatureCard({
  icon,
  title,
  description,
  badge,
  iconClassName,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClassName ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
        >
          {icon}
        </div>
        {badge && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
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

export function FeaturesSection() {
  return (
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
            iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Analytics"
            description="Track clicks, locations, devices, and referrers in real time."
            iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Fast Redirects"
            description="Sub-50ms redirects from 300+ Cloudflare edge locations."
            iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <FeatureCard
            icon={<QrCode className="h-5 w-5" />}
            title="QR Codes"
            description="Generate QR codes for any link. Change destination without reprinting."
            badge="Coming Soon"
            iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </div>
      </div>
    </section>
  );
}
