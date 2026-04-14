# Contributing to Qurl

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (v9+)
- A [Supabase](https://supabase.com/) account (free tier works)
- A [Cloudflare](https://www.cloudflare.com/) account (free tier works)

## Local Development Setup

Follow the full setup guide in [docs/setup.md](docs/setup.md).

Quick version:

```bash
git clone https://github.com/norens/url-shortener.git
cd url-shortener
pnpm install
cp apps/api/.env.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env.local
# Fill in your Supabase credentials in both files
make dev
```

API runs on `http://localhost:8787`, web on `http://localhost:3000`.

## Project Structure

```
apps/api/       — Hono API on Cloudflare Workers
apps/web/       — Next.js frontend on Cloudflare Workers (OpenNext)
packages/shared/ — Shared types & constants
docs/           — Design specs and guides
```

## Development Workflow

1. Create a branch from `main`.
2. Make your changes.
3. Run checks before pushing:
   ```bash
   pnpm lint        # Biome lint + format check
   pnpm typecheck   # TypeScript strict mode
   pnpm test        # Vitest tests
   ```
4. Push your branch and open a pull request.

## Coding Standards

- **Formatting & linting:** [Biome](https://biomejs.dev/) — run `pnpm lint` to check, `pnpm lint:fix` to auto-fix.
- **TypeScript:** Strict mode enabled. No `any` unless absolutely necessary.
- **Style:** Follow existing patterns in the codebase. When in doubt, look at nearby files.

## Commit Messages

Use a short imperative description:

- `Add custom alias validation`
- `Fix redirect loop on expired links`
- `Update analytics dashboard layout`

No need for a rigid format — just be clear about what changed and why.

## Pull Request Guidelines

- Keep PRs focused on a single change.
- Describe what you changed and why in the PR description.
- Link related issues (e.g., "Closes #12").
- Make sure CI passes before requesting review.

## Reporting Bugs

Open a [GitHub issue](https://github.com/norens/url-shortener/issues) with:

- A clear description of the bug.
- Steps to reproduce.
- Expected vs. actual behavior.
- Browser/OS if relevant.

## Feature Requests

Open an issue to discuss the idea before starting implementation. This avoids wasted effort if the feature doesn't fit the project direction.

## Questions?

Open an issue or start a discussion. We're happy to help.
