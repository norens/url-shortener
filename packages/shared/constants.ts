import type { AnalyticsPeriod, QrConfigInput } from "./types";

export const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const SHORT_CODE_LENGTH = 7;
export const MAX_ALIAS_LENGTH = 7;
export const ALIAS_REGEX = /^[a-zA-Z0-9_-]+$/;

export const CACHE_TTL_SECONDS = 86400; // 24 hours
export const MAX_COLLISION_RETRIES = 3;

export const PLAN_LIMITS = {
  free: {
    links: 20,
    clicks_per_month: 10_000,
    analytics_retention_days: 30,
  },
  pro: {
    links: 500,
    clicks_per_month: 100_000,
    analytics_retention_days: 365,
  },
  business: {
    links: -1, // unlimited
    clicks_per_month: -1,
    analytics_retention_days: -1,
  },
} as const;

export const ANONYMOUS_LINK_EXPIRY_DAYS = 7;
export const ANONYMOUS_RATE_LIMIT = 5;
export const ANONYMOUS_RATE_LIMIT_WINDOW = 3600;

export const SHORT_URL_BASE = "https://api.qurl.nazarf.dev";

export const PERIOD_DAYS: Record<AnalyticsPeriod, number | null> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
  all: null,
};

/** Default QR styling when no config row exists for a link. */
export const DEFAULT_QR_CONFIG: QrConfigInput = {
  fg_color: "#0F172A",
  bg_color: "#FFFFFF",
  logo_url: null,
  dots_style: "square", // Week 1 ships square-dot only; other styles land in Week 2
  corners_style: "square",
  corners_dot_style: "square",
  gradient: null,
  frame_config: null,
  ecc: "M",
  preset_id: null,
  size_px: 512,
};

/** KV cache TTL for server-rendered QR SVGs. */
export const QR_CACHE_TTL_SECONDS = 3600;

/** URL parameter appended to QR-encoded short URLs so the redirect handler can tag scans. */
export const QR_SOURCE_PARAM = "qrs";
export const QR_SOURCE_VALUE = "1";

/** Helper that builds the API route for a link's server-rendered SVG. */
export const qrSvgRoute = (shortCode: string) => `/api/qr/${shortCode}.svg`;
