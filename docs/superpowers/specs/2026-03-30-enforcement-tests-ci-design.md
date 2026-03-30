# Qurl: Enforcement, Tests, Linting & CI

## Context

Qurl has plan limits defined in constants (`clicks_per_month`, `analytics_retention_days`) but they are not enforced. There are no tests, no CI pipeline, and linting exists only for the web app (ESLint). This spec adds enforcement, a test suite, project-wide linting, and a CI pipeline.

## 1. Clicks/Month Enforcement

**Location:** `apps/api/src/routes/redirect.ts`

Before tracking a click, check if the link owner has exceeded their monthly click limit:
- Query `urls.user_id` for the short code (already fetched or cacheable)
- If `user_id` is null (anonymous link): skip enforcement, always track
- If `user_id` exists: query `profiles.plan`, then check `click_totals.total_clicks` against `PLAN_LIMITS[plan].clicks_per_month`
- If `clicks_per_month === -1` (unlimited): skip enforcement
- If limit exceeded: **still redirect** (never break a link), but **skip tracking** (no increment, no scan record)

This is a soft limit — the link keeps working, analytics just stop recording.

**Helper function:** `shouldTrackClick(supabase, shortCode): Promise<boolean>` in redirect.ts.

**Cache consideration:** To avoid an extra DB query on every redirect, cache the check result in KV with short TTL (5 min). Key: `clicks_check:${short_code}`, value: `"track"` or `"skip"`.

## 2. Analytics Retention

**Location:** `apps/api/supabase/migrations/003_analytics_retention.sql`

Create a SQL function:
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_analytics()
RETURNS void AS $$
DELETE FROM url_scans
WHERE short_code IN (
  SELECT u.short_code FROM urls u
  JOIN profiles p ON u.user_id = p.id
  WHERE p.plan = 'free'
)
AND scanned_at < now() - interval '30 days';

DELETE FROM url_scans
WHERE short_code IN (
  SELECT u.short_code FROM urls u
  JOIN profiles p ON u.user_id = p.id
  WHERE p.plan = 'pro'
)
AND scanned_at < now() - interval '365 days';
$$ LANGUAGE sql;
```

Business plan (retention = -1) is never cleaned. Anonymous links (user_id IS NULL) are cleaned after 7 days (their expiry).

Can be invoked manually via `SELECT cleanup_expired_analytics()` or scheduled via Supabase pg_cron later.

## 3. Tests (Vitest + @cloudflare/vitest-pool-workers)

### API Tests (`apps/api/src/__tests__/`)

**Test files:**
- `shorten.test.ts` — anonymous shorten endpoint
  - Valid URL returns 201 with short_code, short_url, expires_at
  - Invalid URL returns 400
  - Missing URL field returns 400
  - Rate limit exceeded returns 429
- `shorten-auth.test.ts` — authenticated shorten endpoint
  - No auth header returns 401
  - Valid request returns 201
  - Link limit exceeded returns 429
  - Alias collision returns 409
- `redirect.test.ts` — redirect endpoint
  - Valid code returns 302 redirect
  - Unknown code returns 404
  - Expired link returns 410
  - Inactive link returns 410
- `ratelimit.test.ts` — rate limiter unit tests
  - First request is allowed
  - Request at limit is blocked
  - Returns correct retryAfter

**Setup:** `vitest.config.ts` in apps/api with `@cloudflare/vitest-pool-workers` pool.

### Web Tests (`apps/web/src/__tests__/`)

Minimal smoke tests with Vitest + React Testing Library:
- `landing.test.tsx` — landing page renders, form submits

**Setup:** `vitest.config.ts` in apps/web with jsdom environment.

## 4. Linting (Biome)

**Config:** `biome.json` at project root

- Replaces ESLint in web (remove `eslint.config.mjs`, eslint deps)
- Adds linting for API (currently has none)
- Lint + format in one tool
- Rules: recommended defaults, TypeScript-aware

**Scripts:**
- Root `package.json`: `"lint": "biome check ."`, `"lint:fix": "biome check --write ."`
- Remove `eslint` script from web package.json

## 5. CI Pipeline (GitHub Actions)

**File:** `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
```

**Root scripts to add:** `"test": "pnpm -r test"`, `"lint": "biome check ."`

## 6. CORS

Already configured correctly for both production (`https://qurl.nazarf.dev`) and dev (`http://localhost:3000`). Anonymous endpoint is under the same CORS middleware. No changes needed.

## Execution Strategy

### Wave 1 (parallel):
- **Agent A:** Clicks enforcement + analytics retention (backend logic + migration)
- **Agent B:** Test infrastructure + API tests (vitest config, test files)
- **Agent C:** Biome linting setup (config, remove ESLint, scripts)

### Wave 2 (parallel):
- **Agent D:** CI pipeline (GitHub Actions workflow)
- **Agent E:** Web tests (vitest config for web, landing page test)
- **Agent F:** Code review of all changes

### Wave 3:
- Build verification — all builds, tests, and lint pass

## Verification

1. `pnpm run lint` passes with zero errors
2. `pnpm run test` — all tests pass
3. `pnpm run typecheck` — no type errors
4. `pnpm run build` — both apps build successfully
5. CI workflow file is valid YAML
