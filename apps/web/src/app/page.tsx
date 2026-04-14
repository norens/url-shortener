"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
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

      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
