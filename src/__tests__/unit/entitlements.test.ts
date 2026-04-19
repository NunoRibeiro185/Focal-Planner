import { describe, it, expect } from "vitest";
import {
  isInLaunchWindow,
  isInTrialWarningWindow,
  getEffectiveTier,
  canUseFeature,
  getRemainingUsage,
  hasReachedLimit,
} from "@/lib/services/entitlements";
import { LAUNCH_WINDOW, PLANS, TRIAL_WARNING_DAYS_BEFORE } from "@/config/plans";
import type { Subscription } from "@/lib/types/database";

// ─── Helpers ──────────────────────────────────────────────────

function daysFromLaunchEnd(days: number): Date {
  const d = new Date(LAUNCH_WINDOW.end);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBeforeLaunchEnd(days: number): Date {
  return daysFromLaunchEnd(-days);
}

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    photographer_id: "photo-1",
    lemon_squeezy_subscription_id: "ls-sub-1",
    lemon_squeezy_customer_id: "ls-cust-1",
    status: "active",
    plan: "monthly",
    price_locked: false,
    current_period_end: daysFromLaunchEnd(30).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── isInLaunchWindow ─────────────────────────────────────────

describe("isInLaunchWindow", () => {
  it("returns true on the first day of the launch window", () => {
    expect(isInLaunchWindow(LAUNCH_WINDOW.start)).toBe(true);
  });

  it("returns true on the last moment of the launch window", () => {
    expect(isInLaunchWindow(LAUNCH_WINDOW.end)).toBe(true);
  });

  it("returns true for a date mid-window", () => {
    const mid = new Date("2026-06-15T12:00:00.000Z");
    expect(isInLaunchWindow(mid)).toBe(true);
  });

  it("returns false one day before the launch window starts", () => {
    const before = new Date(LAUNCH_WINDOW.start);
    before.setDate(before.getDate() - 1);
    expect(isInLaunchWindow(before)).toBe(false);
  });

  it("returns false one day after the launch window ends", () => {
    expect(isInLaunchWindow(daysFromLaunchEnd(1))).toBe(false);
  });

  it("returns false well before the launch window", () => {
    expect(isInLaunchWindow(new Date("2026-01-01T00:00:00.000Z"))).toBe(false);
  });

  it("returns false well after the launch window", () => {
    expect(isInLaunchWindow(new Date("2027-01-01T00:00:00.000Z"))).toBe(false);
  });
});

// ─── isInTrialWarningWindow ───────────────────────────────────

describe("isInTrialWarningWindow", () => {
  it("returns true exactly at the start of the warning window", () => {
    expect(isInTrialWarningWindow(daysBeforeLaunchEnd(TRIAL_WARNING_DAYS_BEFORE))).toBe(true);
  });

  it("returns true one day before launch window ends", () => {
    expect(isInTrialWarningWindow(daysBeforeLaunchEnd(1))).toBe(true);
  });

  it("returns true on the last moment of the launch window", () => {
    expect(isInTrialWarningWindow(LAUNCH_WINDOW.end)).toBe(true);
  });

  it("returns false one day before the warning window starts", () => {
    expect(isInTrialWarningWindow(daysBeforeLaunchEnd(TRIAL_WARNING_DAYS_BEFORE + 1))).toBe(false);
  });

  it("returns false after the launch window ends", () => {
    expect(isInTrialWarningWindow(daysFromLaunchEnd(1))).toBe(false);
  });

  it("returns false well before the launch window", () => {
    expect(isInTrialWarningWindow(new Date("2026-01-01"))).toBe(false);
  });
});

// ─── getEffectiveTier ─────────────────────────────────────────

describe("getEffectiveTier", () => {
  it("returns trial during launch window with no subscription", () => {
    const mid = new Date("2026-06-15T12:00:00.000Z");
    expect(getEffectiveTier(null, mid)).toBe("trial");
  });

  it("returns trial during launch window even with an active subscription", () => {
    const mid = new Date("2026-06-15T12:00:00.000Z");
    expect(getEffectiveTier(makeSubscription(), mid)).toBe("trial");
  });

  it("returns trial on the first day of the launch window", () => {
    expect(getEffectiveTier(null, LAUNCH_WINDOW.start)).toBe("trial");
  });

  it("returns trial on the last moment of the launch window", () => {
    expect(getEffectiveTier(null, LAUNCH_WINDOW.end)).toBe("trial");
  });

  it("returns pro after launch window with active subscription", () => {
    expect(getEffectiveTier(makeSubscription(), daysFromLaunchEnd(1))).toBe("pro");
  });

  it("returns pro after launch window with active annual subscription", () => {
    const sub = makeSubscription({ plan: "annual" });
    expect(getEffectiveTier(sub, daysFromLaunchEnd(1))).toBe("pro");
  });

  it("returns free after launch window with no subscription", () => {
    expect(getEffectiveTier(null, daysFromLaunchEnd(1))).toBe("free");
  });

  it("returns free after launch window with cancelled subscription", () => {
    const sub = makeSubscription({ status: "cancelled" });
    expect(getEffectiveTier(sub, daysFromLaunchEnd(1))).toBe("free");
  });

  it("returns free after launch window with past_due subscription", () => {
    const sub = makeSubscription({ status: "past_due" });
    expect(getEffectiveTier(sub, daysFromLaunchEnd(1))).toBe("free");
  });

  it("returns free after launch window with paused subscription", () => {
    const sub = makeSubscription({ status: "paused" });
    expect(getEffectiveTier(sub, daysFromLaunchEnd(1))).toBe("free");
  });

  it("returns free before launch window with no subscription", () => {
    expect(getEffectiveTier(null, new Date("2026-04-01"))).toBe("free");
  });

  it("returns pro before launch window with active subscription", () => {
    const sub = makeSubscription();
    expect(getEffectiveTier(sub, new Date("2026-04-01"))).toBe("pro");
  });
});

// ─── canUseFeature ────────────────────────────────────────────

describe("canUseFeature", () => {
  const lockedFeatures = Object.entries(PLANS.free.features)
    .filter(([, allowed]) => !allowed)
    .map(([key]) => key) as (keyof typeof PLANS.free.features)[];

  const allFeatureKeys = Object.keys(PLANS.free.features) as (keyof typeof PLANS.free.features)[];

  it("allows all features on trial tier", () => {
    for (const feature of allFeatureKeys) {
      expect(canUseFeature("trial", feature)).toBe(true);
    }
  });

  it("allows all features on pro tier", () => {
    for (const feature of allFeatureKeys) {
      expect(canUseFeature("pro", feature)).toBe(true);
    }
  });

  it("blocks all locked features on free tier", () => {
    for (const feature of lockedFeatures) {
      expect(canUseFeature("free", feature)).toBe(false);
    }
  });

  it("blocks googleCalendarSync on free tier", () => {
    expect(canUseFeature("free", "googleCalendarSync")).toBe(false);
  });

  it("blocks insights on free tier", () => {
    expect(canUseFeature("free", "insights")).toBe(false);
  });

  it("blocks secondShooter on free tier", () => {
    expect(canUseFeature("free", "secondShooter")).toBe(false);
  });

  it("blocks inquiryForms on free tier", () => {
    expect(canUseFeature("free", "inquiryForms")).toBe(false);
  });

  it("blocks contractSigning on free tier", () => {
    expect(canUseFeature("free", "contractSigning")).toBe(false);
  });
});

// ─── getRemainingUsage ────────────────────────────────────────

describe("getRemainingUsage", () => {
  it("returns null for pro tier (unlimited)", () => {
    expect(getRemainingUsage("pro", "bookingsPerMonth", 100)).toBeNull();
  });

  it("returns null for trial tier (unlimited)", () => {
    expect(getRemainingUsage("trial", "bookingsPerMonth", 100)).toBeNull();
  });

  it("returns full limit when usage is 0", () => {
    expect(getRemainingUsage("free", "bookingsPerMonth", 0)).toBe(5);
  });

  it("returns correct remaining when partially used", () => {
    expect(getRemainingUsage("free", "bookingsPerMonth", 3)).toBe(2);
  });

  it("returns 0 when exactly at the limit", () => {
    expect(getRemainingUsage("free", "bookingsPerMonth", 5)).toBe(0);
  });

  it("returns 0 (not negative) when over the limit", () => {
    expect(getRemainingUsage("free", "bookingsPerMonth", 10)).toBe(0);
  });

  it("applies packages limit correctly", () => {
    expect(getRemainingUsage("free", "packagesTotal", 1)).toBe(1);
    expect(getRemainingUsage("free", "packagesTotal", 2)).toBe(0);
  });

  it("applies expenses limit correctly", () => {
    expect(getRemainingUsage("free", "expensesPerMonth", 0)).toBe(3);
    expect(getRemainingUsage("free", "expensesPerMonth", 3)).toBe(0);
  });
});

// ─── hasReachedLimit ──────────────────────────────────────────

describe("hasReachedLimit", () => {
  it("returns false for pro tier regardless of count", () => {
    expect(hasReachedLimit("pro", "bookingsPerMonth", 999)).toBe(false);
  });

  it("returns false for trial tier regardless of count", () => {
    expect(hasReachedLimit("trial", "bookingsPerMonth", 999)).toBe(false);
  });

  it("returns false when under the limit", () => {
    expect(hasReachedLimit("free", "bookingsPerMonth", 4)).toBe(false);
  });

  it("returns true when exactly at the limit", () => {
    expect(hasReachedLimit("free", "bookingsPerMonth", 5)).toBe(true);
  });

  it("returns true when over the limit", () => {
    expect(hasReachedLimit("free", "bookingsPerMonth", 6)).toBe(true);
  });

  it("returns true for packages at limit", () => {
    expect(hasReachedLimit("free", "packagesTotal", 2)).toBe(true);
  });

  it("returns false for packages under limit", () => {
    expect(hasReachedLimit("free", "packagesTotal", 1)).toBe(false);
  });

  it("returns true for expenses at limit", () => {
    expect(hasReachedLimit("free", "expensesPerMonth", 3)).toBe(true);
  });
});

// ─── Plans config shape ───────────────────────────────────────

describe("plans config", () => {
  it("free tier has all required feature keys", () => {
    const keys: (keyof typeof PLANS.free.features)[] = [
      "googleCalendarSync",
      "insights",
      "secondShooter",
      "inquiryForms",
      "contractSigning",
    ];
    for (const key of keys) {
      expect(typeof PLANS.free.features[key]).toBe("boolean");
    }
  });

  it("pro tier has all required feature keys set to true", () => {
    for (const value of Object.values(PLANS.pro.features)) {
      expect(value).toBe(true);
    }
  });

  it("free tier has non-negative limits or null", () => {
    for (const value of Object.values(PLANS.free.limits)) {
      if (value !== null) expect(value).toBeGreaterThan(0);
    }
  });

  it("pro tier has all null limits (unlimited)", () => {
    for (const value of Object.values(PLANS.pro.limits)) {
      expect(value).toBeNull();
    }
  });
});
