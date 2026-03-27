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

// Cached URL structure in Redis
export interface CachedUrl {
  long_url: string;
  expires_at: string | null;
  is_active: boolean;
}
