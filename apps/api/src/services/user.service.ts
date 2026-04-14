import type { Deps } from "../types";
import * as profileRepo from "../repositories/profile.repository";
import * as urlRepo from "../repositories/url.repository";

export async function getProfile(deps: Deps, userId: string) {
  const [{ data: profile }, { count }] = await Promise.all([
    profileRepo.findPlanAndLimit(deps.supabase, userId),
    urlRepo.countByUser(deps.supabase, userId),
  ]);

  return {
    plan: profile?.plan ?? "free",
    links_count: count ?? 0,
    links_limit: profile?.links_limit ?? 20,
  };
}
