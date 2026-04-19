import {
  LAUNCH_WINDOW,
  PLANS,
  TRIAL_WARNING_DAYS_BEFORE,
  type EffectiveTier,
  type FeatureKey,
  type UsageLimitKey,
} from "@/config/plans";
import type { Subscription } from "@/lib/types/database";

export function isInLaunchWindow(now: Date = new Date()): boolean {
  return now >= LAUNCH_WINDOW.start && now <= LAUNCH_WINDOW.end;
}

export function isInTrialWarningWindow(now: Date = new Date()): boolean {
  const warningStart = new Date(LAUNCH_WINDOW.end);
  warningStart.setDate(warningStart.getDate() - TRIAL_WARNING_DAYS_BEFORE);
  return now >= warningStart && now <= LAUNCH_WINDOW.end;
}

/**
 * Resolves the effective tier for a photographer given their subscription state
 * and the current date.
 *
 * - During the launch window: always "trial" (full Pro access, no payment needed)
 * - After the launch window with an active subscription: "pro"
 * - Otherwise: "free"
 */
export function getEffectiveTier(
  subscription: Subscription | null,
  now: Date = new Date()
): EffectiveTier {
  if (isInLaunchWindow(now)) return "trial";
  if (subscription && subscription.status === "active") return "pro";
  return "free";
}

export function canUseFeature(tier: EffectiveTier, feature: FeatureKey): boolean {
  if (tier === "trial" || tier === "pro") return true;
  return PLANS.free.features[feature];
}

/**
 * Returns the remaining usage quota for a resource on the given tier.
 * Returns null if the tier has unlimited access.
 * Returns 0 if the limit is reached or exceeded.
 */
export function getRemainingUsage(
  tier: EffectiveTier,
  resource: UsageLimitKey,
  currentCount: number
): number | null {
  if (tier === "trial" || tier === "pro") return null;
  const limit = PLANS.free.limits[resource];
  if (limit === null) return null;
  return Math.max(0, limit - currentCount);
}

export function hasReachedLimit(
  tier: EffectiveTier,
  resource: UsageLimitKey,
  currentCount: number
): boolean {
  const remaining = getRemainingUsage(tier, resource, currentCount);
  return remaining !== null && remaining <= 0;
}
