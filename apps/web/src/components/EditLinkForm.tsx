"use client";

import { useState } from "react";
import { apiPatch, apiDelete } from "@/lib/api";

interface Props {
  shortCode: string;
  initialUrl: string;
  initialTitle: string | null;
  isActive: boolean;
  onUpdated: () => void;
}

export function EditLinkForm({
  shortCode,
  initialUrl,
  initialTitle,
  isActive,
  onUpdated,
}: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiPatch(`/api/links/${shortCode}`, {
        long_url: url,
        title: title || undefined,
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setSaving(true);
    setError("");

    try {
      if (isActive) {
        await apiDelete(`/api/links/${shortCode}`);
      } else {
        await apiPatch(`/api/links/${shortCode}`, { is_active: true });
      }
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-medium text-gray-900">Edit Link</h3>
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Destination URL
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={saving}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              isActive
                ? "text-red-600 hover:bg-red-50"
                : "text-green-600 hover:bg-green-50"
            } disabled:opacity-50`}
          >
            {isActive ? "Deactivate" : "Reactivate"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
