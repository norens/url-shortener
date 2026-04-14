.PHONY: dev dev-api dev-web build build-api build-web typecheck test lint lint-fix install clean deploy deploy-api deploy-web preview-web

# Run both API and web in parallel
dev:
	@echo "Starting API (port 8787) and Web (port 3000)..."
	@pnpm --filter api dev & pnpm --filter web dev

# Run API only (Cloudflare Workers via wrangler)
dev-api:
	pnpm --filter api dev

# Run web only (Next.js)
dev-web:
	pnpm --filter web dev

# Build all
build:
	pnpm --filter api build && pnpm --filter web build

build-api:
	pnpm --filter api build

build-web:
	pnpm --filter web build

# Type check all packages
typecheck:
	pnpm -r typecheck

# Run all tests
test:
	pnpm -r test

# Lint all packages (check only)
lint:
	pnpm run lint

# Lint and auto-fix all packages
lint-fix:
	pnpm run lint:fix

# Install dependencies
install:
	pnpm install

# Deploy all
deploy: deploy-api deploy-web

# Deploy API to Cloudflare Workers
deploy-api:
	pnpm --filter api run deploy

# Deploy web to Cloudflare Workers (via OpenNext)
deploy-web:
	pnpm --filter web run deploy

# Preview web in local Workers runtime
preview-web:
	pnpm --filter web preview

# Clean build artifacts and node_modules
clean:
	rm -rf node_modules apps/api/node_modules apps/web/node_modules packages/shared/node_modules
	rm -rf apps/web/.next apps/web/.open-next
