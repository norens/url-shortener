export interface Profile {
  id: string;
  email: string;
  plan: "free" | "pro" | "business";
  links_limit: number;
  created_at: string;
}

export interface Url {
  id: string;
  user_id: string;
  short_code: string;
  long_url: string;
  title: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClickTotal {
  short_code: string;
  total_clicks: number;
  updated_at: string;
}

export interface UrlScan {
  id: number;
  short_code: string;
  scanned_at: string;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  referer: string | null;
  device_type: "mobile" | "desktop" | "tablet" | "unknown";
  source?: QrSource;
}

// API Request types
export interface ShortenRequest {
  long_url: string;
  alias?: string;
  title?: string;
  expires_at?: string;
}

export interface UpdateLinkRequest {
  long_url?: string;
  title?: string;
  is_active?: boolean;
}

// API Response types
export interface ShortenResponse {
  short_code: string;
  short_url: string;
  long_url: string;
  title: string | null;
  created_at: string;
}

export interface LinkWithClicks extends Url {
  total_clicks: number;
}

export interface AnalyticsResponse {
  short_code: string;
  total_clicks: number;
  clicks_today: number;
  period: string;
  period_clicks: number;
  daily_clicks: { date: string; clicks: number }[];
  top_countries: { country: string; clicks: number }[];
  top_cities: { city: string; clicks: number }[];
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
    unknown: number;
  };
  recent_scans: UrlScan[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d" | "365d" | "all";

// Cached URL structure in KV
export interface CachedUrl {
  long_url: string;
  expires_at: string | null;
  is_active: boolean;
  user_id: string | null;
}

// ----------------------------------------------------------------
// QR Code types
// ----------------------------------------------------------------

/** Source channel of a scan/click. null = direct, 'qr' = scanned QR. */
export type QrSource = "qr" | null;

export type QrDotsStyle =
  | "square"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";

export type QrCornersStyle =
  | "square"
  | "rounded"
  | "dot"
  | "extra-rounded"
  | "inpoint"
  | "outpoint";

export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export interface QrGradient {
  type: "linear" | "radial";
  rotation?: number; // degrees
  stops: { offset: number; color: string }[];
}

export interface QrFrameConfig {
  style: "none" | "box" | "tooltip" | "banner" | "ribbon";
  text?: string;
  textColor?: string;
  fgColor?: string;
  bgColor?: string;
  fontFamily?: string;
  borderRadius?: number;
}

/** Row shape of the qr_configs table (mirrors migration 005). */
export interface QrConfig {
  short_code: string;
  fg_color: string | null;
  bg_color: string | null;
  logo_url: string | null;
  dots_style: QrDotsStyle | null;
  corners_style: QrCornersStyle | null;
  corners_dot_style: QrCornersStyle | null;
  gradient: QrGradient | null;
  frame_config: QrFrameConfig | null;
  ecc: QrErrorCorrection | null;
  preset_id: string | null;
  size_px: number;
  created_at: string;
  updated_at: string;
}

/** Input shape for upserting a QR config (no PK or timestamps). */
export type QrConfigInput = Omit<
  QrConfig,
  "short_code" | "created_at" | "updated_at"
>;
