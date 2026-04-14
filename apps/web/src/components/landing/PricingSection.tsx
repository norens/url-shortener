import { Check } from "lucide-react";
import Link from "next/link";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

function PlanItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
      {children}
    </li>
  );
}

export function PricingSection() {
  return (
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
          <div className="relative overflow-hidden rounded-xl border-2 border-indigo-600 bg-white p-6 dark:border-indigo-400 dark:bg-gray-900">
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600" />
            <span className="absolute -top-3 left-4 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-3 py-0.5 text-xs font-medium text-white">
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
              className="mt-6 block w-full rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
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
              href={`mailto:${CONTACT_EMAIL}`}
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
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-6 block w-full rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
