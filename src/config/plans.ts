export type PlanTier = "free" | "pro";
export type EffectiveTier = "trial" | "free" | "pro";

export type FeatureKey =
  | "googleCalendarSync"
  | "insights"
  | "secondShooter"
  | "inquiryForms"
  | "contractSigning";

export type UsageLimitKey = "bookingsPerMonth" | "packagesTotal" | "expensesPerMonth";

export interface TierConfig {
  features: Record<FeatureKey, boolean>;
  limits: Record<UsageLimitKey, number | null>; // null = unlimited
}

const FREE: TierConfig = {
  features: {
    googleCalendarSync: false,
    insights: false,
    secondShooter: false,
    inquiryForms: false,
    contractSigning: false,
  },
  limits: {
    bookingsPerMonth: 5,
    packagesTotal: 3,
    expensesPerMonth: 3,
  },
};

const PRO: TierConfig = {
  features: {
    googleCalendarSync: true,
    insights: true,
    secondShooter: true,
    inquiryForms: true,
    contractSigning: true,
  },
  limits: {
    bookingsPerMonth: null,
    packagesTotal: null,
    expensesPerMonth: null,
  },
};

export const PLANS: Record<PlanTier, TierConfig> = { free: FREE, pro: PRO };

// Trial-specific overrides (apply on top of PRO during trial)
export const TRIAL_OVERRIDES = {
  contractSigningFreeUses: 3,
};

// Launch window: all users get full Pro access free within this range
export const LAUNCH_WINDOW = {
  start: new Date("2026-04-21T00:00:00.000Z"),
  end: new Date("2026-07-31T23:59:59.999Z"),
};

// Warning sent this many days before launch window ends
export const TRIAL_WARNING_DAYS_BEFORE = 7;

// Pricing (in cents to avoid float issues)
export const PRICING = {
  launch: {
    monthly: 1000, // €10.00
    annual: 10000, // €100.00 (10 months)
  },
  regular: {
    monthly: 1500, // €15.00
    annual: 15000, // €150.00 (10 months)
  },
};
