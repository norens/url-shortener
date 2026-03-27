"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-900">Profile</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium uppercase text-gray-500">
              Email
            </label>
            <p className="text-sm text-gray-900">{user?.email ?? "Loading..."}</p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase text-gray-500">
              Account created
            </label>
            <p className="text-sm text-gray-900">
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

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-900">Plan</h2>
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              Free
            </span>
            <span className="text-sm text-gray-500">25 links, basic analytics</span>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Paid plans with more features coming soon.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-900">Danger Zone</h2>
        <div className="mt-4">
          <button
            onClick={handleLogout}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
