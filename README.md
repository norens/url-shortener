<p align="center">
  <img src="apps/web/public/readme-banner.svg" alt="Qurl" width="100%" />
</p>

# Qurl

[![CI](https://github.com/norens/url-shortener/actions/workflows/ci.yml/badge.svg)](https://github.com/norens/url-shortener/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Free URL shortener with analytics. Shorten links, track clicks, see where they come from.

## Features

- Free URL shortening with custom aliases
- Click analytics (countries, cities, devices, referrers)
- Plan-based limits (Free / Pro / Business)
- Anonymous links (no sign-up required, 7-day expiry)
- Sub-50ms redirects via Cloudflare's edge network
- Dark mode support

**Live:** [qurl.nazarf.dev](https://qurl.nazarf.dev)
**API:** [api.qurl.nazarf.dev](https://api.qurl.nazarf.dev/health)

## Stack

| Layer | Tech | Platform |
|-------|------|----------|
| API | Hono | Cloudflare Workers |
| Web | Next.js 16 | Cloudflare Workers (OpenNext) |
| Cache | KV | Cloudflare KV |
| Database | PostgreSQL | Supabase |
| Auth | Supabase Auth | Supabase |

## Project Structure

```
qurl/
├── apps/
│   ├── api/          # Hono API (CF Workers)
│   └── web/          # Next.js frontend (CF Workers via OpenNext)
├── packages/
│   └── shared/       # Shared types & constants
├── docs/             # Design specs
├── Makefile
└── pnpm-workspace.yaml
```

## Quick Start

See [docs/setup.md](docs/setup.md) for full setup guide.

```bash
pnpm install
cp apps/api/.env.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env.local
# Fill in Supabase credentials in both files

make dev
```

API runs on `http://localhost:8787`, web on `http://localhost:3000`.

## Deploy

See [docs/deploy.md](docs/deploy.md) for full deploy guide.

```bash
make deploy          # Deploy both API and web
make deploy-api      # Deploy API only
make deploy-web      # Deploy web only
```

## API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/:code` | - | Redirect (302) |
| `POST` | `/api/shorten` | JWT | Create short link |
| `GET` | `/api/resolve/:code` | - | Resolve without redirect |
| `GET` | `/api/links` | JWT | List user's links |
| `PATCH` | `/api/links/:code` | JWT | Update link |
| `DELETE` | `/api/links/:code` | JWT | Deactivate link |
| `GET` | `/api/analytics/:code` | JWT | Link analytics |
| `GET` | `/api/me` | JWT | Current user info |
| `GET` | `/health` | - | Health check |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md). Please do not open public issues for security concerns.

## License

This project is licensed under the [MIT License](LICENSE).
