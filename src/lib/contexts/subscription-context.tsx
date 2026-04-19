"use client";

import { createContext, useContext } from "react";
import type { EffectiveTier, FeatureKey, UsageLimitKey } from "@/config/plans";
import {
  canUseFeature,
  getRemainingUsage,
  hasReachedLimit,
} from "@/lib/services/entitlements";

interface SubscriptionContextValue {
  tier: EffectiveTier;
  canUse: (feature: FeatureKey) => boolean;
  remaining: (resource: UsageLimitKey, currentCount: number) => number | null;
  atLimit: (resource: UsageLimitKey, currentCount: number) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({
  tier,
  children,
}: {
  tier: EffectiveTier;
  children: React.ReactNode;
}) {
  const value: SubscriptionContextValue = {
    tier,
    canUse: (feature) => canUseFeature(tier, feature),
    remaining: (resource, count) => getRemainingUsage(tier, resource, count),
    atLimit: (resource, count) => hasReachedLimit(tier, resource, count),
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
