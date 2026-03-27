export const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const SHORT_CODE_LENGTH = 7;
export const MAX_ALIAS_LENGTH = 7;
export const ALIAS_REGEX = /^[a-zA-Z0-9_-]+$/;

export const CACHE_TTL_SECONDS = 86400; // 24 hours
export const MAX_COLLISION_RETRIES = 3;

export const PLAN_LIMITS = {
  free: {
    links: 25,
    clicks_per_month: 1000,
    analytics_retention_days: 30,
  },
  pro: {
    links: 1000,
    clicks_per_month: 50000,
    analytics_retention_days: 365,
  },
  business: {
    links: -1, // unlimited
    clicks_per_month: -1,
    analytics_retention_days: -1,
  },
} as const;

export const SHORT_URL_BASE = "https://api.qurl.nazarf.dev";
