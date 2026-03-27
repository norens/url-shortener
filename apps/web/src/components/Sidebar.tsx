"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link2, Settings, BarChart3 } from "lucide-react";
import { clsx } from "clsx";

const navigation = [
  { name: "Links", href: "/links", icon: Link2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="flex h-16 items-center px-6">
        <Link href="/links" className="text-xl font-bold text-gray-900">
          Qurl
        </Link>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
