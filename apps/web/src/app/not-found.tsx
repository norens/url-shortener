import type { Metadata } from "next";
import Link from "next/link";
import { QUrlLogo } from "@/components/QUrlLogo";

export const metadata: Metadata = { title: "Page not found — Qurl" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950 px-6 text-center">
      <QUrlLogo size="lg" />
      <p className="mt-6 text-6xl font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Page not found
      </h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Go Home
      </Link>
    </div>
  );
}
