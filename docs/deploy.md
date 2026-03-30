# Deploy

Both API and web deploy to Cloudflare Workers. Everything runs on one Cloudflare account.

## Prerequisites

- Cloudflare account with domain configured
- Wrangler CLI authenticated (`npx wrangler login`)
- Supabase project with migration applied

## Architecture

```
qurl.nazarf.dev        -> Cloudflare Workers (Next.js via OpenNext)
api.qurl.nazarf.dev    -> Cloudflare Workers (Hono)
Cloudflare KV          -> URL cache + rate limiting
Supabase               -> PostgreSQL + Auth
```

## Deploy API

```bash
make deploy-api
```

This runs `wrangler deploy` from `apps/api/`. Config is in `apps/api/wrangler.toml`.

### API secrets

Set once after first deploy:

```bash
cd apps/api
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### KV namespace

Already configured in `wrangler.toml`. To create a new one:

```bash
cd apps/api
npx wrangler kv namespace create URL_CACHE
# Update the id in wrangler.toml
```

### Custom domain

The route `api.qurl.nazarf.dev` is configured in `wrangler.toml`. Cloudflare auto-creates DNS records on deploy.

## Deploy Web

```bash
make deploy-web
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy` from `apps/web/`.

### Environment variables

`NEXT_PUBLIC_*` vars are inlined at build time. For production builds, create `apps/web/.env.production`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.qurl.nazarf.dev
```

### Custom domain

Add via Cloudflare Dashboard: Workers & Pages > `qurl-web` > Settings > Domains & Routes > Add Custom Domain.

## Deploy all

```bash
make deploy
```

## Preview locally

Test the web app in local Workers runtime before deploying:

```bash
make preview-web
```

## Supabase configuration

In Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://qurl.nazarf.dev`
- **Redirect URLs**:
  - `https://qurl.nazarf.dev/callback`
  - `http://localhost:3000/callback` (for local dev)

## Troubleshooting

### Multiple Cloudflare accounts

If wrangler fails with "More than one account available", ensure `account_id` is set in both:
- `apps/api/wrangler.toml`
- `apps/web/wrangler.jsonc`

### OpenNext build fails with "pages-manifest.json not found"

Remove any stale `pnpm-lock.yaml` inside `apps/web/` — it confuses OpenNext's monorepo detection.

### Middleware error during OpenNext build

OpenNext requires Edge middleware, not Node.js middleware. Use `middleware.ts` with the `middleware()` export, not `proxy.ts`.
