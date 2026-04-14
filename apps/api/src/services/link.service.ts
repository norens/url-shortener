import type { CachedUrl } from "@qurl/shared";
import {
  ANONYMOUS_LINK_EXPIRY_DAYS,
  ANONYMOUS_RATE_LIMIT,
  ANONYMOUS_RATE_LIMIT_WINDOW,
  MAX_COLLISION_RETRIES,
  SHORT_URL_BASE,
} from "@qurl/shared";
import type { Deps } from "../types";
import {
  ConflictError,
  ForbiddenError,
  GoneError,
  InternalError,
  LimitReachedError,
  NotFoundError,
  RateLimitError,
} from "../errors";
import { generateShortCode } from "../lib/codegen";
import * as cacheRepo from "../repositories/cache.repository";
import * as profileRepo from "../repositories/profile.repository";
import * as urlRepo from "../repositories/url.repository";
import type { ListOptions } from "../repositories/url.repository";

// --- Input types ---

interface CreateLinkInput {
  userId: string;
  long_url: string;
  alias?: string;
  title?: string;
  expires_at?: string;
}

interface CreateAnonymousLinkInput {
  url: string;
  ip: string;
}

// --- Private helpers ---

async function generateUniqueCode(deps: Deps): Promise<string> {
  for (let i = 0; i < MAX_COLLISION_RETRIES; i++) {
    const candidate = generateShortCode();
    const exists = await urlRepo.codeExists(deps.supabase, candidate);
    if (!exists) return candidate;
  }
  throw new InternalError("Failed to generate unique code. Please try again.");
}

async function verifyOwnership(
  deps: Deps,
  userId: string,
  code: string,
): Promise<void> {
  const { data } = await urlRepo.findWithOwnership(deps.supabase, code);
  if (!data) throw new NotFoundError("Link not found");
  if (data.user_id !== userId) throw new ForbiddenError();
}

// --- Public service functions ---

export async function createLink(deps: Deps, input: CreateLinkInput) {
  const { userId, long_url, alias, title, expires_at } = input;

  // Per-user rate limit: 20 requests per hour
  const rl = await cacheRepo.checkRateLimit(deps.kv, userId, 20, 3600);
  if (!rl.allowed) {
    throw new RateLimitError(
      "Rate limit exceeded. Try again in an hour.",
      rl.retryAfter,
    );
  }

  // Check user's link count against limit
  const [{ count }, { data: profile }] = await Promise.all([
    urlRepo.countByUser(deps.supabase, userId),
    profileRepo.findById(deps.supabase, userId),
  ]);

  if (profile && count !== null && count >= profile.links_limit) {
    throw new LimitReachedError(
      "Link limit reached. Upgrade your plan for more links.",
    );
  }

  // Generate or validate short code
  let shortCode: string;

  if (alias) {
    const exists = await urlRepo.codeExists(deps.supabase, alias);
    if (exists) {
      throw new ConflictError("This alias is already taken");
    }
    shortCode = alias;
  } else {
    shortCode = await generateUniqueCode(deps);
  }

  // Insert URL
  const { data: url, error } = await urlRepo.insert(deps.supabase, {
    user_id: userId,
    short_code: shortCode,
    long_url,
    title: title ?? null,
    expires_at: expires_at ?? null,
  });

  if (error || !url) {
    throw new InternalError("Failed to create short link");
  }

  // Cache the new URL (caller handles waitUntil)
  const cachePromise = cacheRepo.setCachedUrl(
    deps.kv,
    shortCode,
    {
      long_url,
      expires_at: expires_at ?? null,
      is_active: true,
      user_id: userId,
    },
    expires_at ?? null,
  );

  return {
    short_code: shortCode,
    short_url: `${SHORT_URL_BASE}/${shortCode}`,
    long_url,
    title: url.title,
    created_at: url.created_at,
    cachePromise,
  };
}

export async function createAnonymousLink(
  deps: Deps,
  input: CreateAnonymousLinkInput,
) {
  const { url: longUrl, ip } = input;

  const rl = await cacheRepo.checkRateLimit(
    deps.kv,
    `anon:${ip}`,
    ANONYMOUS_RATE_LIMIT,
    ANONYMOUS_RATE_LIMIT_WINDOW,
  );
  if (!rl.allowed) {
    throw new RateLimitError(
      "Rate limit exceeded. Try again in an hour.",
      rl.retryAfter,
    );
  }

  const shortCode = await generateUniqueCode(deps);

  const expiresAt = new Date(
    Date.now() + ANONYMOUS_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await urlRepo.insert(deps.supabase, {
    user_id: null,
    short_code: shortCode,
    long_url: longUrl,
    title: null,
    expires_at: expiresAt,
  });

  if (error) {
    throw new InternalError("Failed to create short link");
  }

  const cachePromise = cacheRepo.setCachedUrl(
    deps.kv,
    shortCode,
    {
      long_url: longUrl,
      expires_at: expiresAt,
      is_active: true,
      user_id: null,
    },
    expiresAt,
  );

  return {
    short_code: shortCode,
    short_url: `${SHORT_URL_BASE}/${shortCode}`,
    long_url: longUrl,
    expires_at: expiresAt,
    cachePromise,
  };
}

export async function resolveLink(deps: Deps, code: string) {
  // 1. Try cache first
  let cached = await cacheRepo.getCachedUrl(deps.kv, code);
  let cachePromise: Promise<void> | undefined;

  // 2. Cache miss — query database
  if (!cached) {
    const { data, error } = await urlRepo.findForRedirect(
      deps.supabase,
      code,
    );

    if (error || !data) {
      throw new NotFoundError("Not found");
    }

    cached = {
      long_url: data.long_url,
      expires_at: data.expires_at,
      is_active: data.is_active,
      user_id: data.user_id,
    };

    // Cache for next request
    cachePromise = cacheRepo.setCachedUrl(
      deps.kv,
      code,
      cached,
      data.expires_at,
    );
  }

  // 3. Check if link is active and not expired
  if (!cached.is_active) {
    throw new GoneError("Link has been deactivated");
  }

  if (cached.expires_at && new Date(cached.expires_at) < new Date()) {
    throw new GoneError("Link has expired");
  }

  return { cached, cachePromise };
}

export async function updateLink(
  deps: Deps,
  userId: string,
  code: string,
  updates: Record<string, unknown>,
) {
  await verifyOwnership(deps, userId, code);

  const { data, error } = await urlRepo.update(deps.supabase, code, updates);

  if (error || !data) {
    throw new InternalError("Failed to update link");
  }

  const cachePromise = cacheRepo.deleteCachedUrl(deps.kv, code);

  return { data, cachePromise };
}

export async function deleteLink(deps: Deps, userId: string, code: string) {
  await verifyOwnership(deps, userId, code);

  const { error } = await urlRepo.deactivate(deps.supabase, code);

  if (error) {
    throw new InternalError("Failed to deactivate link");
  }

  const cachePromise = cacheRepo.deleteCachedUrl(deps.kv, code);

  return { cachePromise };
}

export async function listLinks(deps: Deps, userId: string, opts: ListOptions) {
  const { data, error, count } = await urlRepo.listPaginated(
    deps.supabase,
    userId,
    opts,
  );

  if (error) {
    throw new InternalError("Failed to fetch links");
  }

  const total = count ?? 0;
  const links = (data ?? []).map((item) => ({
    id: item.id,
    short_code: item.short_code,
    short_url: `${SHORT_URL_BASE}/${item.short_code}`,
    long_url: item.long_url,
    title: item.title,
    is_active: item.is_active,
    expires_at: item.expires_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
    total_clicks:
      (item.click_totals as { total_clicks: number }[] | null)?.[0]
        ?.total_clicks ?? 0,
  }));

  return {
    data: links,
    total,
    page: opts.page,
    per_page: opts.perPage,
    total_pages: Math.ceil(total / opts.perPage),
  };
}
