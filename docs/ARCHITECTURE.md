# Architecture

## Overview

Qurl is a SaaS URL shortener deployed entirely on Cloudflare Workers, with Supabase (PostgreSQL) as the database and Cloudflare KV for caching.

```
                   ┌──────────────────┐
                   │     Browser      │
                   └────────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
   ┌─────────────────┐        ┌─────────────────┐
   │   Web (Next.js)  │        │   API (Hono)     │
   │   CF Workers     │───────▶│   CF Workers     │
   │   (OpenNext)     │        │                  │
   └─────────────────┘        └────────┬─────────┘
                                       │
                          ┌────────────┼────────────┐
                          ▼                         ▼
                  ┌──────────────┐         ┌──────────────┐
                  │  Supabase    │         │  Cloudflare   │
                  │  (PostgreSQL)│         │  KV Cache     │
                  └──────────────┘         └──────────────┘
```

## Monorepo Structure

The project uses **pnpm workspaces** with **Turborepo** for orchestration.

| Path | Package | Description |
|---|---|---|
| `apps/api` | `@qurl/api` | Hono REST API on Cloudflare Workers |
| `apps/web` | `@qurl/web` | Next.js 16 frontend on Cloudflare Workers (OpenNext) |
| `packages/shared` | `@qurl/shared` | Shared TypeScript types and constants (plans, limits) |

## API Architecture

The API follows a **3-layer pattern**: routes → services → repositories.

```
apps/api/src/
├── index.ts              Entry point: middleware registration, route mounting
├── types.ts              Env bindings, Deps interface, CF_HEADERS constants
├── errors/index.ts       AppError hierarchy (NotFound, Validation, RateLimit, etc.)
├── middleware/
│   ├── auth.ts           Extracts Bearer token, attaches user to context
│   └── error-handler.ts  Catches AppError subclasses, returns structured JSON
├── routes/               Thin handlers: parse input → call service → return response
├── services/             Business logic: validation, authorization, orchestration
│   ├── link.ts           CRUD for links, code generation, plan limit checks
│   ├── click.ts          Click recording and redirect resolution
│   ├── analytics.ts      Aggregation queries (parallel batches)
│   └── user.ts           Profile and usage retrieval
├── repositories/         Data access: one file per table/resource
│   ├── cache.ts          KV get/put/delete for redirect cache
│   ├── url.ts            URLs table queries
│   ├── profile.ts        Profiles table queries
│   ├── scan.ts           URL scans (analytics events)
│   └── click-total.ts    Click totals (aggregate counters)
└── lib/                  Pure utilities
    ├── codegen.ts         Random short code generation
    ├── device.ts          User-Agent → device type parsing
    ├── validation.ts      Zod schemas (httpUrlSchema, etc.)
    └── supabase.ts        Supabase client factory
```

**Error handling**: All known errors throw `AppError` subclasses. The error-handler middleware catches them and returns consistent JSON responses with appropriate HTTP status codes. Unknown errors become 500s.

## Web Architecture

The frontend uses **Next.js App Router** with client-side data fetching via SWR.

```
apps/web/src/
├── app/                  App Router pages
│   ├── page.tsx          Landing page (composition of section components)
│   ├── (auth)/           Login, signup (use shared AuthForm + useAuth)
│   └── (dashboard)/      Links list, link detail, settings (use useApiSWR)
├── components/
│   ├── landing/          HeroSection, FeaturesSection, PricingSection, Footer
│   ├── auth/             AuthForm (shared login/signup form)
│   ├── analytics/        ClicksChart, CountryList, DeviceBreakdown, etc.
│   └── ...               CreateLinkDialog, EditLinkForm, Header, Sidebar
├── hooks/
│   ├── useCopyToClipboard.ts   Clipboard API with timeout reset
│   ├── useApiSWR.ts            SWR wrapper with auth headers via apiFetch
│   └── useAuth.ts              Supabase auth state, login/logout/signup
└── lib/
    ├── api.ts             apiFetch: base URL + Bearer token + error handling
    └── supabase/          Supabase browser client initialization
```

## Data Flow: Redirect

When a user visits a short link (`qurl.cc/:code`):

1. API receives `GET /:code`
2. **KV cache check** -- look up `redirect:{code}` in Cloudflare KV
3. **Cache miss** -- query `urls` table for the short code, write result to KV
4. Validate the link is active and not expired
5. **Click tracking** (fire-and-forget via `waitUntil`):
   - Insert row into `url_scans` with country, city, device, referer
   - Call `increment_clicks` RPC to atomically bump the counter
6. Return **302 redirect** to the long URL

## Caching Strategy

**Cache-aside pattern** using Cloudflare KV:

- **Write**: On first redirect or after cache miss, store `{longUrl, isActive, expiresAt}` keyed by `redirect:{code}`
- **Invalidate**: On link update or delete, remove the KV entry
- **TTL**: KV entries use configurable TTL (default 1 hour)
- **Scope**: Only redirect data is cached; analytics are always fetched from the database

## Authentication

- **Provider**: Supabase Auth (email/password + Google OAuth)
- **Flow**: The web app obtains a JWT from Supabase, sends it as `Authorization: Bearer <token>` to the API
- **Middleware**: The `auth` middleware validates the token via Supabase, attaches the user ID to the Hono context
- **Anonymous access**: Link creation and redirects work without auth; anonymous links expire after 7 days
- **RLS**: Database queries from authenticated users go through Supabase RLS policies; the API's service role bypasses RLS for redirects and anonymous inserts

## Rate Limiting

KV-based sliding window rate limiting:

- **Authenticated users**: Rate limited per user ID
- **Anonymous requests**: Rate limited per IP address
- **Storage**: KV keys with TTL matching the rate limit window
- **Enforcement**: Middleware checks the counter before the request reaches the route handler; returns 429 when exceeded
