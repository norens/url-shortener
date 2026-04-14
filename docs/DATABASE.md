# Database Schema

Qurl uses **Supabase (PostgreSQL)** with Row-Level Security enabled on all tables.

## Tables

### profiles

Extends Supabase `auth.users`. Auto-created via trigger on signup.

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `UUID` (PK) | -- | References `auth.users(id)`, cascade delete |
| `email` | `TEXT` | -- | User's email address |
| `plan` | `TEXT` | `'free'` | Subscription tier: free, pro, business |
| `links_limit` | `INT` | `20` | Maximum number of links allowed |
| `created_at` | `TIMESTAMPTZ` | `now()` | Account creation timestamp |

### urls

Shortened links. `user_id` is nullable for anonymous links.

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `UUID` (PK) | `gen_random_uuid()` | Unique link ID |
| `user_id` | `UUID` (FK, nullable) | -- | Owner; null for anonymous links |
| `short_code` | `VARCHAR(10)` (UNIQUE) | -- | The short URL slug |
| `long_url` | `TEXT` | -- | Destination URL |
| `title` | `VARCHAR(255)` | -- | Optional display title |
| `is_active` | `BOOLEAN` | `true` | Whether the link redirects |
| `expires_at` | `TIMESTAMPTZ` | -- | Optional expiration (7 days for anonymous) |
| `created_at` | `TIMESTAMPTZ` | `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `now()` | Last update timestamp |

### click_totals

Aggregate click counter per link. Auto-created via trigger when a URL is inserted.

| Column | Type | Default | Description |
|---|---|---|---|
| `short_code` | `VARCHAR(10)` (PK, FK) | -- | References `urls(short_code)`, cascade delete |
| `total_clicks` | `BIGINT` | `0` | Running click count |
| `updated_at` | `TIMESTAMPTZ` | `now()` | Last click timestamp |

### url_scans

Individual click events for analytics.

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `BIGSERIAL` (PK) | auto | Event ID |
| `short_code` | `VARCHAR(10)` (FK) | -- | References `urls(short_code)`, cascade delete |
| `scanned_at` | `TIMESTAMPTZ` | `now()` | When the click occurred |
| `country` | `VARCHAR(2)` | -- | ISO country code (from CF headers) |
| `city` | `VARCHAR(100)` | -- | City name (from CF headers) |
| `user_agent` | `TEXT` | -- | Raw User-Agent string |
| `referer` | `TEXT` | -- | HTTP Referer header |
| `device_type` | `VARCHAR(10)` | -- | Parsed device: desktop, mobile, tablet, bot |

## Relationships

```
auth.users
    │
    ▼ (1:1)
profiles
    │
    ▼ (1:N, nullable)
urls ──────────── click_totals  (1:1, by short_code)
    │
    ▼ (1:N)
url_scans
```

## Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_urls_user_id` | `urls` | `user_id` | Fast lookup of a user's links |
| `idx_urls_short_code` | `urls` | `short_code` | Fast redirect resolution (supplements UNIQUE) |
| `idx_scans_short_code` | `url_scans` | `short_code` | Filter scans by link |
| `idx_scans_scanned_at` | `url_scans` | `scanned_at DESC` | Time-range queries for analytics |
| `idx_scans_short_code_scanned_at` | `url_scans` | `short_code, scanned_at DESC` | Composite: analytics for a specific link in a time range |

## RPC Functions

### `increment_clicks(code TEXT) → VOID`
Atomically increments `click_totals.total_clicks` and updates `updated_at`. Called via `waitUntil` on every redirect.

### `count_user_monthly_clicks(p_user_id UUID, p_month_start TIMESTAMPTZ) → BIGINT`
Counts all clicks across a user's links since `p_month_start`. Used to enforce monthly click limits per plan.

### `cleanup_expired_analytics() → VOID`
Scheduled cleanup function. Deletes `url_scans` rows based on plan retention:
- **Free**: older than 30 days
- **Pro**: older than 365 days
- **Anonymous**: older than 7 days
- **Business**: never cleaned

## Triggers

| Trigger | Table | Function | Description |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | `handle_new_user()` | Auto-creates a `profiles` row on signup |
| `on_url_created` | `urls` | `handle_new_url()` | Auto-creates a `click_totals` row for the new short code |

## Row-Level Security

All tables have RLS enabled. Key policies:

**profiles**: Users can SELECT and UPDATE their own row (`auth.uid() = id`).

**urls**: Users can SELECT, INSERT, UPDATE, DELETE their own rows (`auth.uid() = user_id`). The service role can SELECT all rows (for redirects) and INSERT rows (for anonymous links).

**click_totals / url_scans**: No user-facing RLS policies; accessed exclusively through RPC functions or the service role.

## Migrations

Migration files live in `apps/api/supabase/migrations/`:

| File | Description |
|---|---|
| `001_initial_schema.sql` | Tables, indexes, RLS policies, triggers, `increment_clicks` RPC |
| `002_anonymous_links.sql` | Nullable `user_id`, updated default `links_limit`, service role INSERT policy |
| `003_analytics_retention.sql` | `cleanup_expired_analytics` scheduled function |
| `004_monthly_clicks.sql` | `count_user_monthly_clicks` RPC |

To run migrations against a local Supabase instance:

```bash
cd apps/api
npx supabase db reset    # drops and recreates from migrations
```
