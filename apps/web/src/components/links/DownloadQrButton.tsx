"use client";

import { useState } from "react";
import { downloadQrPng } from "@/lib/qr-download";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

interface DownloadQrButtonProps {
  shortCode: string;
  /** Optional className override so the parent row can tweak spacing. */
  className?: string;
}

export function DownloadQrButton({
  shortCode,
  className,
}: DownloadQrButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent bubbling — this button may live inside an anchor/card that
    // navigates on click, and we never want the download to also trigger nav.
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError(null);
    try {
      await downloadQrPng({
        apiBaseUrl: API_BASE_URL,
        shortCode,
        size: 1024,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ??
        "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
      }
      aria-label={`Download QR code for ${shortCode}`}
      title={error ?? "Download QR code"}
    >
      {loading ? <Spinner /> : <QrIcon />}
    </button>
  );
}

function QrIcon() {
  // Inline SVG — keeps the component independent of the icon pack version.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" />
      <path d="M17 17h4" />
      <path d="M17 20h4" />
      <path d="M20 17v4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
