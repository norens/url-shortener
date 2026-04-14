# API Refactoring Design: Routes → Services → Repositories

## Context

The API (`apps/api/`) works correctly but has architectural issues typical of rapid prototyping:
route handlers contain all business logic, data access, and computation inline. This makes
the code hard to test, modify, and reason about. The goal is to introduce proper separation
of concerns (routes → services → repositories) while also fixing duplicated code,
inconsistent error handling, and unoptimized query patterns.

**Scope:** API only (apps/api/). Frontend refactoring is a separate follow-up.
**Approach:** Structure + improvements (not just file moves — also fix error handling, optimize queries, deduplicate).

---

## Target Architecture

```
apps/api/src/
├── index.ts                          — app entry, middleware, route mounting
├── types.ts                          — Env, AppContext types (extracted from index.ts)
│
├── errors/
│   └── index.ts                      — AppError class hierarchy
│
├── middleware/
│   ├── auth.ts                       — Bearer token validation (existing, minor cleanup)
│   └── error-handler.ts              — global onError → consistent JSON responses
│
├── routes/                           — THIN handlers: parse → service → respond
│   ├── analytics.ts                  — ~20 lines (was 315)
│   ├── shorten.ts                    — ~30 lines (was 245)
│   ├── redirect.ts                   — ~15 lines (was 184)
│   ├── links.ts                      — ~30 lines (was 166)
│   ├── resolve.ts                    — ~10 lines (was 52)
│   └── me.ts                         — ~10 lines (was 37)
│
├── services/                         — business logic (throws AppError on failure)
│   ├── link.service.ts               — create, resolve, update, delete, list, ownership
│   ├── click.service.ts              — shouldTrackClick + trackClick
│   ├── analytics.service.ts          — period clamping, bucket building, aggregation
│   └── user.service.ts               — profile + plan info
│
├── repositories/                     — data access (returns raw data, no errors thrown)
│   ├── url.repository.ts             — urls table queries
│   ├── scan.repository.ts            — url_scans + count_user_monthly_clicks RPC
│   ├── profile.repository.ts         — profiles table
│   ├── click-total.repository.ts     — click_totals + increment_clicks RPC
│   └── cache.repository.ts           — all KV operations (url cache, clicks check, rate limit)
│
├── lib/                              — pure utilities (unchanged or cleaned up)
│   ├── codegen.ts                    — generateShortCode (unchanged)
│   ├── device.ts                     — parseDeviceType (unchanged)
│   ├── validation.ts                 — Zod schemas (deduplicated URL refinement)
│   └── supabase.ts                   — createSupabaseClient (unchanged)
│
└── __tests__/
    ├── anonymous-shorten.test.ts     — existing (updated imports)
    ├── redirect.test.ts              — existing (updated imports)
    └── ratelimit.test.ts             — existing (updated imports)
```

**Style:** Plain functions, not classes. Workers are stateless; DI container unnecessary.
Each function takes dependencies as explicit parameters via a `Deps` type:
```ts
// types.ts
type Deps = {
  supabase: ReturnType<typeof createSupabaseClient>;
  kv: KVNamespace;
};
```
Services accept `Deps` (or a subset). Repositories accept individual deps (supabase or kv).

---

## Error Handling (New)

### `errors/index.ts` — AppError hierarchy

```
AppError (base: statusCode + message)
  ├── NotFoundError (404)      — "Link not found"
  ├── ForbiddenError (403)     — "Forbidden"
  ├── ConflictError (409)      — "This alias is already taken"
  ├── GoneError (410)          — "Link has been deactivated" / "Link has expired"
  ├── RateLimitError (429)     — carries retryAfter for Retry-After header
  ├── LimitReachedError (429)  — "Link limit reached. Upgrade your plan."
  └── InternalError (500)      — "Failed to create short link"
```

### `middleware/error-handler.ts` — global handler

Registered via `app.onError()` in `index.ts`. Catches `AppError` subclasses:
- Returns `{ error: e.message }` with `e.statusCode`
- `RateLimitError` adds `Retry-After` header
- Unknown errors → 500 with `"Internal server error"` (no stack leak)

**Impact:** Eliminates every inline `return c.json({ error: "..." }, statusCode)` from services.
Route handlers only need `return c.json(result)` — errors propagate via throw.

---

## Repositories (Data Access Layer)

Each repository file exports plain functions that accept a Supabase client (and/or KV namespace)
and return raw query results. Repositories do NOT throw AppErrors — the service layer decides
what errors mean.

### `url.repository.ts`
- `findByCode(supabase, code)` — select by short_code
- `findForRedirect(supabase, code)` — select long_url, expires_at, is_active, user_id
- `findWithOwnership(supabase, code)` — select user_id, created_at
- `countByUser(supabase, userId)` — count where user_id matches
- `codeExists(supabase, code)` — lightweight existence check (for collision retry)
- `insert(supabase, row)` — insert new URL, return created row
- `update(supabase, code, updates)` — update by short_code
- `deactivate(supabase, code)` — set is_active = false
- `listPaginated(supabase, userId, opts)` — paginated list with search, sort, join to click_totals

### `scan.repository.ts`
- `insertScan(supabase, scan)` — insert url_scan record
- `findByCodeSince(supabase, code, sinceDate)` — scans for analytics period
- `countUserMonthlyClicks(supabase, userId, monthStart)` — calls count_user_monthly_clicks RPC

### `profile.repository.ts`
- `findById(supabase, userId)` — full profile
- `findPlan(supabase, userId)` — plan field only

### `click-total.repository.ts`
- `findByCode(supabase, code)` — total_clicks for a code
- `increment(supabase, code)` — calls increment_clicks RPC

### `cache.repository.ts`
Absorbs `lib/kv.ts` and `lib/ratelimit.ts`:
- `getCachedUrl(kv, code)` / `setCachedUrl(kv, code, data, expiresAt)` / `deleteCachedUrl(kv, code)`
- `getUserClicksCheck(kv, userId)` / `setUserClicksCheck(kv, userId, decision)`
- `checkRateLimit(kv, key, limit, windowSeconds)` — moved from lib/ratelimit.ts

---

## Services (Business Logic Layer)

Each service exports plain functions that accept dependencies and implement business logic.
Services throw `AppError` subclasses on failure.

### `link.service.ts`
- `createLink(deps, input)` — rate limit check → link count vs plan limit → alias validation
  or collision retry → insert → cache. Unifies the currently duplicated logic from
  `routes/shorten.ts` lines 22-142 and 146-242.
- `createAnonymousLink(deps, input)` — IP rate limit → collision retry → insert with expiry → cache.
- `resolveLink(deps, code)` — cache-then-DB pattern (currently duplicated in redirect.ts:30-54
  and resolve.ts:17-39). Returns CachedUrl or throws NotFoundError/GoneError.
- `updateLink(deps, userId, code, updates)` — verifyOwnership → update → invalidate cache.
- `deleteLink(deps, userId, code)` — verifyOwnership → deactivate → invalidate cache.
- `listLinks(deps, userId, opts)` — paginated listing with search/sort.
- `generateUniqueCode(deps)` — (private) collision retry loop, used by both create methods.
  Eliminates the duplication at shorten.ts:76-98 and shorten.ts:177-189.
- `verifyOwnership(deps, userId, code)` — (private) ownership check.
  Eliminates the duplication at links.ts:94-106 and links.ts:137-149.

### `click.service.ts`
- `trackClickIfAllowed(deps, code, userId, meta)` — combines shouldTrackClick (redirect.ts:104-152)
  + trackClick (redirect.ts:161-182). Checks plan limits via KV cache → DB fallback → records
  scan + increments counter.

### `analytics.service.ts`
- `getAnalytics(deps, userId, code, requestedPeriod)` — full analytics pipeline:
  verify ownership → fetch plan → clamp period → query scans → build buckets → aggregate.
- `computeSinceDate(period)` — simplified from 31-line switch to lookup:
  ```ts
  const days = PERIOD_DAYS[period];
  if (days === null) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  ```
- `clampPeriodToPlan(requested, retentionDays)` — moved as-is.
- `buildBuckets(period, linkCreatedAt, scans)` — moved as-is (complex but correct, not worth
  simplifying further).
- `aggregateTop(scans, field, limit)` — generic helper replacing the duplicated
  country/city aggregation loops at analytics.ts:262-283.

### `user.service.ts`
- `getProfile(deps, userId)` — fetch profile + link count, return profile response.

---

## Improvements Alongside Restructuring

### 1. Validation deduplication (`lib/validation.ts`)
URL refinement (protocol check) is duplicated 3x at lines 8-16, 44-52, 61-69.
Extract once:
```ts
const httpUrlSchema = z.string().url("Invalid URL format").refine(
  (url) => {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  },
  { message: "Only http and https URLs are allowed" },
);
```
Then reuse: `long_url: httpUrlSchema`, `url: httpUrlSchema`, `long_url: httpUrlSchema.optional()`.

### 2. Query parallelization in analytics
Currently 4 sequential queries (ownership, profile, click_total, scans).
After refactoring: 2 parallel batches:
1. `Promise.all([findWithOwnership, findPlan])` — verify + get plan
2. `Promise.all([findByCode (clicks), findByCodeSince (scans)])` — get data

### 3. CORS from env
Currently hardcoded at index.ts:26. Move origins to `ALLOWED_ORIGINS` env var or constant.

### 4. Magic string elimination
CF headers (`cf-ipcountry`, `cf-ipcity`, `cf-connecting-ip`) → named constants in `types.ts`.

### 5. Sort parameter validation
`links.ts:20` takes `sort` directly from query — add whitelist of allowed columns.

### 6. Unused KV functions cleanup
`getClicksCheck`/`setClicksCheck` in kv.ts (lines 48-64) use per-code keys but redirect.ts
uses per-user keys (`getUserClicksCheck`/`setUserClicksCheck`). The per-code functions are unused.
Remove them during cache.repository.ts creation.

---

## Implementation Order

Each step preserves existing tests and API contract.

### Phase 1: Foundation (no behavior changes)
1. **Create `types.ts`** — extract `Env` and context types from `index.ts`. Update all imports.
2. **Create `errors/index.ts`** — define AppError hierarchy. No files use it yet.
3. **Create `middleware/error-handler.ts`** — register `app.onError()`. Nothing throws yet → no change.
4. **Clean up `lib/validation.ts`** — extract shared `httpUrlSchema`.

### Phase 2: Repositories (data access extraction)
5. **Create `repositories/cache.repository.ts`** — absorb `lib/kv.ts` + `lib/ratelimit.ts`.
6. **Create `repositories/url.repository.ts`** — extract `urls` table queries from routes.
7. **Create `repositories/profile.repository.ts`** — extract `profiles` queries.
8. **Create `repositories/scan.repository.ts`** — extract `url_scans` queries + RPC.
9. **Create `repositories/click-total.repository.ts`** — extract `click_totals` queries + RPC.

### Phase 3: Services (business logic extraction)
10. **Create `services/link.service.ts`** — extract from shorten.ts, resolve.ts, links.ts.
11. **Create `services/click.service.ts`** — extract shouldTrackClick + trackClick from redirect.ts.
12. **Create `services/analytics.service.ts`** — extract from analytics.ts.
13. **Create `services/user.service.ts`** — extract from me.ts.

### Phase 4: Thin Routes (rewrite handlers)
14. **Rewrite `routes/shorten.ts`** — parse → LinkService.createLink → respond.
15. **Rewrite `routes/redirect.ts`** — LinkService.resolveLink → ClickService.trackClickIfAllowed → redirect.
16. **Rewrite `routes/resolve.ts`** — LinkService.resolveLink → respond.
17. **Rewrite `routes/links.ts`** — LinkService CRUD methods.
18. **Rewrite `routes/analytics.ts`** — AnalyticsService.getAnalytics → respond.
19. **Rewrite `routes/me.ts`** — UserService.getProfile → respond.
20. **Update `index.ts`** — clean up imports, CORS from env.

### Phase 5: Cleanup
21. **Delete `lib/kv.ts` and `lib/ratelimit.ts`** — fully replaced by cache.repository.ts.
22. **Update test mocks** — point to new import paths.

---

## Test Strategy

**Existing tests** mock `createSupabaseClient` from `../lib/supabase`. Since services and
repositories call the same factory, the mock intercepts at the same level → tests work
through all phases without changes until Phase 5 (import path updates).

**After refactoring:** Verify all 3 existing test files pass (anonymous-shorten, redirect, ratelimit).

---

## Verification

After each phase:
1. `pnpm --filter api typecheck` — no type errors
2. `pnpm --filter api test` — all 3 test files pass
3. Manual test of critical flows:
   - POST /api/shorten/anonymous — creates anonymous link
   - GET /:code — redirects correctly
   - GET /api/analytics/:code — returns analytics JSON
   - GET /api/links — returns paginated list

---

## Files to Modify (Critical)

- `apps/api/src/routes/analytics.ts` — 315 lines → ~20 line handler + service + repo
- `apps/api/src/routes/shorten.ts` — 245 lines → ~30 line handler + service
- `apps/api/src/routes/redirect.ts` — 184 lines → ~15 line handler + service
- `apps/api/src/routes/links.ts` — 166 lines → ~30 line handler + service
- `apps/api/src/routes/resolve.ts` — 52 lines → ~10 line handler
- `apps/api/src/routes/me.ts` — 37 lines → ~10 line handler
- `apps/api/src/lib/validation.ts` — deduplicate URL schema
- `apps/api/src/lib/kv.ts` — absorbed into cache.repository.ts, then deleted
- `apps/api/src/lib/ratelimit.ts` — absorbed into cache.repository.ts, then deleted
- `apps/api/src/index.ts` — extract types, register error handler, clean up CORS

## Files to Create (New)

- `apps/api/src/types.ts`
- `apps/api/src/errors/index.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/api/src/repositories/url.repository.ts`
- `apps/api/src/repositories/scan.repository.ts`
- `apps/api/src/repositories/profile.repository.ts`
- `apps/api/src/repositories/click-total.repository.ts`
- `apps/api/src/repositories/cache.repository.ts`
- `apps/api/src/services/link.service.ts`
- `apps/api/src/services/click.service.ts`
- `apps/api/src/services/analytics.service.ts`
- `apps/api/src/services/user.service.ts`
