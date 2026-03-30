import type { AnalyticsPeriod } from "./types";

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
