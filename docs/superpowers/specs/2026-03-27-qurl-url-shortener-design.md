# Qurl — URL Shortener SaaS Design Spec

## Context

Build **Qurl** — a SaaS URL shortener service at `qurl.nazarf.dev`. The product shortens URLs with analytics tracking, and will later expand to include customizable QR codes as a premium feature. Revenue model is freemium with paid tiers via Stripe (Phase 2).

**Reference:** [qrkit-dynamic-qr](https://github.com/ukimsanov/qrkit-dynamic-qr) — a similar project using Hono + Cloudflare Workers + Supabase + Redis.

## Phases

- **Phase 1 (MVP):** Auth + URL shortening + basic analytics + dashboard
- **Phase 2:** QR codes with customization (colors, branding, logo) + Stripe payments + plan tiers
- **Phase 3:** Custom domains, teams, API keys, advanced analytics

This spec covers **Phase 1 only**.

---

## Architecture

**Monorepo** with two applications and shared packages:

```
qurl/
├── apps/
│   ├── api/          # Hono API on Cloudflare Workers
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared types & constants
├── package.json      # pnpm workspace root
└── pnpm-workspace.yaml
```

### Services

| Service | Platform | Domain | Purpose |
|---------|----------|--------|---------|
| API | Cloudflare Workers | `api.qurl.nazarf.dev` | Redirects, REST API |
| Web | Vercel (primary) or Cloudflare Pages | `qurl.nazarf.dev` | Dashboard, landing, auth |
| Database | Supabase (PostgreSQL) | managed | Persistent storage |
| Cache | Upstash Redis | managed | Redirect cache, rate limiting |

### Why separate API on CF Workers?

URL redirects are the hottest path — they must be fast (<50ms). Cloudflare Workers run on 300+ edge locations globally. Keeping redirects on Workers (not behind Next.js) gives sub-50ms response times.

---

## Database Schema

### `profiles` — User accounts (extends Supabase auth.users)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | References `auth.users(id)` ON DELETE CASCADE |
| `email` | TEXT NOT NULL | |
| `plan` | TEXT DEFAULT 'free' | `'free'` / `'pro'` / `'business'` |
| `links_limit` | INT DEFAULT 25 | Max links for current plan |
| `created_at` | TIMESTAMPTZ | |

### `urls` — Short links

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → profiles | ON DELETE CASCADE |
| `short_code` | VARCHAR(10) UNIQUE | 7-char base62 or custom alias |
| `long_url` | TEXT NOT NULL | Destination URL |
| `title` | VARCHAR(255) | Optional user label |
| `is_active` | BOOLEAN DEFAULT true | Soft-deactivate |
| `expires_at` | TIMESTAMPTZ | Optional expiration |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `click_totals` — Aggregate click counter

| Column | Type | Notes |
|--------|------|-------|
| `short_code` | VARCHAR(10) PK FK → urls | ON DELETE CASCADE |
| `total_clicks` | BIGINT DEFAULT 0 | Atomic increment |
| `updated_at` | TIMESTAMPTZ | |

### `url_scans` — Detailed scan events

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `short_code` | VARCHAR(10) FK → urls | ON DELETE CASCADE |
| `scanned_at` | TIMESTAMPTZ DEFAULT now() | |
| `country` | VARCHAR(2) | ISO code from CF-IPCountry |
| `city` | VARCHAR(100) | |
| `user_agent` | TEXT | |
| `referer` | TEXT | |
| `device_type` | VARCHAR(10) | `'mobile'` / `'desktop'` / `'tablet'` |

### Indexes

- `idx_urls_user_id` ON urls(user_id)
- `idx_urls_short_code` ON urls(short_code)
- `idx_scans_short_code` ON url_scans(short_code)
- `idx_scans_scanned_at` ON url_scans(scanned_at DESC)

### Row Level Security

- `urls`: users can only CRUD their own rows (`auth.uid() = user_id`)
- `profiles`: users can only read/update their own profile (`auth.uid() = id`)
- `click_totals` and `url_scans`: accessed via API (service role key), not directly from client

---

## API Design (Hono on Cloudflare Workers)

### Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/:code` | None | Redirect to long_url (302) |
| `POST` | `/api/shorten` | JWT | Create short link |
| `GET` | `/api/resolve/:code` | None | Get long_url without redirect |
| `PATCH` | `/api/links/:code` | JWT | Update destination URL |
| `DELETE` | `/api/links/:code` | JWT | Deactivate link (soft delete) |
| `GET` | `/api/links` | JWT | List user's links (paginated) |
| `GET` | `/api/analytics/:code` | JWT | Analytics for a link |
| `GET` | `/health` | None | Health check |

### Redirect Flow (critical path)

```
GET /:code
  1. Redis lookup: url:{code}
  2. Cache HIT → parse { long_url, expires_at, is_active }
     - expired or inactive? → 410 Gone
     - valid? → 302 redirect
  3. Cache MISS → Supabase SELECT from urls WHERE short_code = code
     - not found? → 404
     - expired/inactive? → 410 Gone
     - valid? → cache in Redis (TTL: min(24h, expires_at)) → 302 redirect
  4. ASYNC (fire-and-forget via executionCtx.waitUntil()):
     - INCREMENT click_totals SET total_clicks = total_clicks + 1
     - INSERT url_scans (country from CF-IPCountry, city, user_agent, referer, device_type)
```

### POST /api/shorten

Request:
```json
{
  "long_url": "https://example.com/very-long-path",
  "alias": "my-link",        // optional, max 7 chars
  "title": "My Link",        // optional
  "expires_at": "2026-12-31" // optional
}
```

Logic:
1. Validate URL format (must be http/https)
2. Check user's link count against `links_limit`
3. Generate 7-char base62 code (crypto random) or use provided alias
4. INSERT into `urls` + `click_totals`
5. Cache in Redis
6. Return `{ short_code, short_url, long_url, created_at }`

Collision handling: retry up to 3 times with new random code.

### GET /api/analytics/:code

Response:
```json
{
  "short_code": "abc1234",
  "total_clicks": 1523,
  "clicks_today": 42,
  "daily_clicks": [
    { "date": "2026-03-21", "clicks": 30 },
    { "date": "2026-03-22", "clicks": 45 }
  ],
  "top_countries": [
    { "country": "US", "clicks": 800 },
    { "country": "UA", "clicks": 300 }
  ],
  "top_cities": [
    { "city": "New York", "clicks": 200 }
  ],
  "devices": {
    "mobile": 600,
    "desktop": 800,
    "tablet": 123
  },
  "recent_scans": [
    { "scanned_at": "...", "country": "US", "city": "NYC", "device_type": "mobile", "referer": "twitter.com" }
  ]
}
```

### Auth Middleware

- Extract `Authorization: Bearer <token>` header
- Verify JWT using Supabase JWKS endpoint
- Extract `user_id` from token claims
- Attach to Hono context (`c.set('userId', userId)`)
- Return 401 if invalid/missing

---

## Frontend (Next.js)

### Pages

**Public:**
- `/` — Landing page: hero section, features, CTA "Get Started Free", demo URL shortener
- `/login` — Email/password + Google OAuth via Supabase Auth
- `/signup` — Registration with email verification

**Dashboard (auth required):**
- `/links` — Links table: short URL, destination (truncated), clicks, created date, status. Search, sort, pagination. "Create Link" button opens modal/dialog.
- `/links/[id]` — Link detail: edit destination, view analytics (7-day chart, top countries, devices, recent scans)
- `/settings` — Profile info, current plan display

### UI Stack

- **Tailwind CSS v4** — utility-first styling
- **Radix UI** — accessible primitives (Dialog, DropdownMenu, Tabs, Toast)
- **Recharts** — analytics charts (line chart for daily clicks, bar chart for countries)
- **SWR** — client-side data fetching with cache and revalidation
- **Lucide React** — icons

### Auth Flow

1. Supabase Auth client-side (`@supabase/ssr` for Next.js)
2. Middleware checks session on dashboard routes
3. JWT token passed to Hono API in `Authorization` header
4. OAuth callback handled via Supabase redirect

---

## Caching Strategy (Upstash Redis)

```
Key:    url:{short_code}
Value:  JSON { long_url, expires_at, is_active }
TTL:    min(24 hours, time until expires_at)
```

**Cache invalidation:**
- `PATCH /api/links/:code` → `DEL url:{code}` (next redirect re-caches)
- `DELETE /api/links/:code` → `DEL url:{code}`

**Expected performance:**
- Cache hit rate: 80%+ (popular links accessed repeatedly)
- Cached redirect: <5ms (Redis) + network
- Uncached redirect: ~50-100ms (Supabase query + cache write)

---

## Short Code Generation

- **Length:** 7 characters
- **Alphabet:** base62 (a-z, A-Z, 0-9) = 62^7 ≈ 3.5 trillion combinations
- **Source:** `crypto.getRandomValues()` (Web Crypto API, available in CF Workers)
- **Custom aliases:** max 7 chars, regex `^[a-zA-Z0-9_-]+$`
- **Collision handling:** retry up to 3 times, then return 500

---

## MVP Limits (Free Plan)

| Limit | Value |
|-------|-------|
| Links per account | 25 |
| Click tracking | 1,000 clicks/month |
| Analytics retention | 30 days |
| Custom aliases | Yes |
| Link expiration | Yes |

Enforcement: check at link creation time (COUNT query), click tracking limit checked async.

---

## Error Handling

| Status | When |
|--------|------|
| 302 | Successful redirect |
| 400 | Invalid URL format, invalid alias |
| 401 | Missing/invalid JWT |
| 403 | Link belongs to another user |
| 404 | Short code not found |
| 410 | Link expired or deactivated |
| 429 | Rate limit exceeded (link creation) |
| 500 | Internal error |

---

## Security

- **CORS:** Allow only `qurl.nazarf.dev` origin on API
- **Secure headers:** X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **URL validation:** Only allow http/https schemes, reject javascript:, data:, etc.
- **RLS:** Supabase row-level security on all user-facing tables
- **JWT verification:** All authenticated endpoints verify Supabase JWT
- **Input sanitization:** Validate and sanitize all user inputs

---

## Phase 2 Preview (not in scope for MVP)

- **QR Codes:** Generate QR for each short link, customizable colors/logo/branding, dynamic QR (change destination without reprinting)
- **Stripe Integration:** Pro ($9/mo) and Business ($29/mo) plans with higher limits
- **API Keys:** For programmatic access
- **Custom Domains:** Users bring their own short domains
