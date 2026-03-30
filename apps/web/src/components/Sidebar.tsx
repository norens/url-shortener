"use client";

import { clsx } from "clsx";
import { Heart, Link2, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Links", href: "/links", icon: Link2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link
          href="/links"
          className="text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          Qurl
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-4">
        <a
          href="https://ko-fi.com/nazarfedyshyn"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950"
        >
          <Heart className="h-4 w-4" />
          Support on Ko-fi
        </a>
      </div>
    </aside>
  );
}
