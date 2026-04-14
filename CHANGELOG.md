# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Architecture refactoring: routes → services → repositories pattern for API
- Custom React hooks: `useCopyToClipboard`, `useApiSWR`, `useAuth`
- Landing page split into composable components
- Auth form consolidation with shared `AuthForm` component
- Global error handler with `AppError` hierarchy
- Open-source infrastructure: CONTRIBUTING.md, SECURITY.md, issue/PR templates
- README badges (CI status, license)
- ARCHITECTURE.md and DATABASE.md documentation

### Changed
- API route handlers reduced to thin wrappers delegating to services
- API layer deduplicated (`apiFetch` internal helper)
- Validation schemas deduplicated (shared `httpUrlSchema`)
- Analytics queries parallelized (4 sequential → 2 parallel batches)
- `computeSinceDate` simplified from 31-line switch to 3-line lookup
- Sort parameter whitelist added for security
- Unused KV cache functions removed

## [0.1.0] - 2025-04-07

### Added
- URL shortening with custom aliases and random 7-character codes
- Anonymous link creation (7-day expiry, no auth required)
- Click analytics: countries, cities, devices, referrers
- Time-series click charts with configurable periods (24h to all-time)
- Plan-based limits (Free/Pro/Business)
- Click tracking enforcement per user monthly aggregate
- KV cache layer for fast redirects
- Rate limiting (per-user and per-IP for anonymous)
- Landing page with URL shortening form
- Dashboard: links list with search/pagination, link detail with analytics
- Settings page with plan info and usage
- Authentication: email/password + Google OAuth via Supabase
- Dark mode support
- Cloudflare Workers deployment (API + Web via OpenNext)
- CI pipeline: lint, typecheck, test, build
- MIT License
