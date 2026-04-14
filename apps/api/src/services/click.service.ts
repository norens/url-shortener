import type { Profile } from "@qurl/shared";
import { PLAN_LIMITS } from "@qurl/shared";
import type { Deps } from "../types";
import { parseDeviceType } from "../lib/device";
import * as cacheRepo from "../repositories/cache.repository";
import * as clickTotalRepo from "../repositories/click-total.repository";
import * as profileRepo from "../repositories/profile.repository";
import * as scanRepo from "../repositories/scan.repository";

interface ClickMeta {
  country: string | null;
  city: string | null;
  userAgent: string | null;
  referer: string | null;
}

/**
 * Track a click if the link owner's plan allows it.
 * Returns a Promise meant to be used with waitUntil.
 */
export function trackClickIfAllowed(
  deps: Deps,
  code: string,
  userId: string | null,
  meta: ClickMeta,
): Promise<void> {
  return shouldTrackClick(deps.kv, deps.supabase, userId)
    .then((shouldTrack) => {
      if (shouldTrack) {
        return trackClick(deps.supabase, code, meta);
      }
    })
    .catch(() => {
      // Enforcement check failed — track anyway to avoid losing data
      return trackClick(deps.supabase, code, meta);
    });
}

/**
 * Determine whether a click should be tracked based on the owner's plan limits.
 * Anonymous links (no user_id) are always tracked.
 * Enforcement is per-user (monthly aggregate across all links), not per-link.
 * Uses KV cache to avoid DB queries on every request.
 */
async function shouldTrackClick(
  kv: KVNamespace,
  supabase: Deps["supabase"],
  userId: string | null,
): Promise<boolean> {
  // Anonymous links: always track
  if (!userId) {
    return true;
  }

  // Check per-user KV cache for previous enforcement decision
  const cachedDecision = await cacheRepo.getUserClicksCheck(kv, userId);
  if (cachedDecision === "skip") return false;
  if (cachedDecision === "track") return true;

  // Cache miss — query DB for plan and current monthly click count
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [profileResult, monthlyClicksResult] = await Promise.all([
    profileRepo.findPlan(supabase, userId),
    scanRepo.countUserMonthlyClicks(supabase, userId, monthStart),
  ]);

  const plan = (profileResult.data?.plan ?? "free") as Profile["plan"];
  const monthlyClicks: number = monthlyClicksResult.data ?? 0;
  const limit = PLAN_LIMITS[plan].clicks_per_month;

  // Unlimited plan
  if (limit === -1) {
    await cacheRepo.setUserClicksCheck(kv, userId, "track");
    return true;
  }

  // Over limit
  if (monthlyClicks >= limit) {
    await cacheRepo.setUserClicksCheck(kv, userId, "skip");
    return false;
  }

  // Under limit
  await cacheRepo.setUserClicksCheck(kv, userId, "track");
  return true;
}

async function trackClick(
  supabase: Deps["supabase"],
  code: string,
  meta: ClickMeta,
): Promise<void> {
  const { country, city, userAgent, referer } = meta;
  const deviceType = parseDeviceType(userAgent);

  await Promise.all([
    clickTotalRepo.increment(supabase, code),
    scanRepo.insertScan(supabase, {
      short_code: code,
      country,
      city,
      user_agent: userAgent,
      referer,
      device_type: deviceType,
    }),
  ]);
}
