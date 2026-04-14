"use client";

import { useCallback, useState } from "react";

export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), timeout);
    },
    [timeout],
  );

  return { copied, copy };
}
