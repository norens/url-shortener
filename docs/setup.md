# Local Setup

## Prerequisites

- Node.js >= 20
- pnpm (`npm i -g pnpm`)
- Supabase project ([supabase.com](https://supabase.com))

## 1. Install dependencies

```bash
pnpm install
```

## 2. Create Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration SQL from `apps/api/supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor
3. In Authentication > URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/callback`

## 3. Configure environment variables

### API (`apps/api/.dev.vars`)

```bash
cp apps/api/.env.example apps/api/.dev.vars
```

Fill in:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENVIRONMENT=development
```

Get these from Supabase > Settings > API.

### Web (`apps/web/.env.local`)

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8787
```

## 4. Run

```bash
make dev        # Both API + web
make dev-api    # API only (port 8787)
make dev-web    # Web only (port 3000)
```

Or use IDEA run configurations: **Dev (All)**, **Dev (API)**, **Dev (Web)**.

## 5. Other commands

```bash
make typecheck  # Type check all packages
make build      # Build all
make clean      # Remove node_modules and build artifacts
```
