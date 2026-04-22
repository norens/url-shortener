import { qrSvgRoute } from "@qurl/shared";

/**
 * Fetches the server-rendered SVG for a short code and triggers a PNG download.
 * Uses OffscreenCanvas where available; falls back to a regular <canvas>.
 */
export async function downloadQrPng(opts: {
  apiBaseUrl: string;
  shortCode: string;
  size?: number; // default 1024 for good print quality
}): Promise<void> {
  const size = opts.size ?? 1024;
  const url = `${opts.apiBaseUrl}${qrSvgRoute(encodeURIComponent(opts.shortCode))}`;
  // Note: short codes are URL-safe by construction, but encodeURIComponent
  // guards against accidental callers passing raw user input.

  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) {
    throw new Error(`Failed to fetch QR for ${opts.shortCode}: ${res.status}`);
  }
  const svgText = await res.text();
  if (!svgText.startsWith("<svg")) {
    throw new Error("Unexpected response: not an SVG");
  }

  const blob = await rasterizeSvgToPng(svgText, size);
  triggerDownload(blob, `qr-${opts.shortCode}.png`);
}

async function rasterizeSvgToPng(svgText: string, size: number): Promise<Blob> {
  const svgBlob = new Blob([svgText], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(svgUrl);
    return await drawToPng(img, size);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

async function drawToPng(img: HTMLImageElement, size: number): Promise<Blob> {
  // Prefer OffscreenCanvas for off-thread rendering when available.
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    ctx.drawImage(img, 0, 0, size, size);
    return await canvas.convertToBlob({ type: "image/png" });
  }
  // Safari <16 fallback.
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  ctx.drawImage(img, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob null"))),
      "image/png",
    );
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the browser has had a moment to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
