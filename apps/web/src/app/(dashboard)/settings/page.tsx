"use client";

import type { User } from "@supabase/supabase-js";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useApiSWR } from "@/hooks/useApiSWR";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

interface MeResponse {
  plan: string;
  links_count: number;
  links_limit: number;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const { data: me } = useApiSWR<MeResponse>("/api/me");
  const { signOut } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [supabase.auth]);

  const linksCount = me?.links_count ?? 0;
  const linksLimit = me?.links_limit ?? 20;
  const usagePct = Math.round((linksCount / linksLimit) * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Settings
      </h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Profile
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Email
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {user?.email ?? "Loading..."}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Account created
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Plan
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Heart className="h-3.5 w-3.5" />
            Free forever
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Links used
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {me ? `${linksCount} / ${linksLimit}` : "Loading..."}
              </span>
            </div>
            {me && (
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enjoying Qurl?{" "}
            <a
              href="https://ko-fi.com/nazarfedyshyn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
            >
              <Heart className="h-3 w-3" />
              Support on Ko-fi
            </a>{" "}
            to keep it running.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-white p-6 dark:border-red-800 dark:bg-gray-900">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Danger Zone
        </h2>
        <div className="mt-4">
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
