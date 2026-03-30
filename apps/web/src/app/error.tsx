"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-5xl font-bold text-red-500">Oops</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Something went wrong
      </h1>
      <p className="mt-2 text-gray-500">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
