import { ImageResponse } from "next/og";

export const alt = "Qurl — URL Shortener";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0b",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <path
            d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20c4.97 0 9.53-1.81 13.03-4.81l-5.66-5.66A12 12 0 1 1 36 24c0 1.61-.32 3.15-.89 4.55l5.72 5.72A19.91 19.91 0 0 0 44 24C44 12.954 35.046 4 24 4z"
            fill="url(#bg)"
          />
          <path
            d="M28 28l12 12M40 40l-0.5-6.5M40 40l-6.5-0.5"
            stroke="url(#bg)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-1px",
          }}
        >
          Qurl
        </span>
      </div>
      <span
        style={{
          fontSize: "28px",
          color: "#a1a1aa",
          marginTop: "16px",
        }}
      >
        Shorten any URL in seconds
      </span>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "8px",
          background: "linear-gradient(90deg, #7c3aed, #4f46e5, #2563eb)",
        }}
      />
    </div>,
    { ...size },
  );
}
