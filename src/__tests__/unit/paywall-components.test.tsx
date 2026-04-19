// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureGate } from "@/components/paywall/feature-gate";
import { UsageLimit } from "@/components/paywall/usage-limit";
import type { EffectiveTier } from "@/config/plans";

// ─── Mock next/link ───────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─── Mock subscription context ────────────────────────────────

import * as subscriptionContext from "@/lib/contexts/subscription-context";
import { canUseFeature, getRemainingUsage, hasReachedLimit } from "@/lib/services/entitlements";

function mockTier(tier: EffectiveTier) {
  vi.spyOn(subscriptionContext, "useSubscription").mockReturnValue({
    tier,
    canUse: (feature) => canUseFeature(tier, feature),
    remaining: (resource, count) => getRemainingUsage(tier, resource, count),
    atLimit: (resource, count) => hasReachedLimit(tier, resource, count),
  });
}

// ─── FeatureGate ──────────────────────────────────────────────

describe("FeatureGate", () => {
  it("renders children when feature is allowed on trial tier", () => {
    mockTier("trial");
    render(
      <FeatureGate feature="insights">
        <span>Analytics dashboard</span>
      </FeatureGate>
    );
    expect(screen.getByText("Analytics dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Pro feature")).not.toBeInTheDocument();
  });

  it("renders children when feature is allowed on pro tier", () => {
    mockTier("pro");
    render(
      <FeatureGate feature="googleCalendarSync">
        <span>Calendar sync</span>
      </FeatureGate>
    );
    expect(screen.getByText("Calendar sync")).toBeInTheDocument();
    expect(screen.queryByText("Pro feature")).not.toBeInTheDocument();
  });

  it("renders upgrade prompt when feature is locked on free tier", () => {
    mockTier("free");
    render(
      <FeatureGate feature="insights">
        <span>Analytics dashboard</span>
      </FeatureGate>
    );
    expect(screen.queryByText("Analytics dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Pro feature")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /upgrade to pro/i })).toHaveAttribute("href", "/pricing");
  });

  it("shows custom description in upgrade prompt", () => {
    mockTier("free");
    render(
      <FeatureGate feature="secondShooter" description="Second shooter requires Pro.">
        <span>content</span>
      </FeatureGate>
    );
    expect(screen.getByText("Second shooter requires Pro.")).toBeInTheDocument();
  });

  it("shows default description when none provided", () => {
    mockTier("free");
    render(
      <FeatureGate feature="inquiryForms">
        <span>content</span>
      </FeatureGate>
    );
    expect(screen.getByText(/upgrade to pro to unlock/i)).toBeInTheDocument();
  });

  it("locks all paid-only features on free tier", () => {
    const lockedFeatures = ["googleCalendarSync", "insights", "secondShooter", "inquiryForms", "contractSigning"] as const;
    for (const feature of lockedFeatures) {
      mockTier("free");
      const { unmount } = render(
        <FeatureGate feature={feature}>
          <span>content</span>
        </FeatureGate>
      );
      expect(screen.getByText("Pro feature")).toBeInTheDocument();
      unmount();
    }
  });
});

// ─── UsageLimit ───────────────────────────────────────────────

describe("UsageLimit", () => {
  it("renders children on trial tier regardless of count", () => {
    mockTier("trial");
    render(
      <UsageLimit resource="bookingsPerMonth" currentCount={999} resourceLabel="bookings this month">
        <button>New Booking</button>
      </UsageLimit>
    );
    expect(screen.getByRole("button", { name: "New Booking" })).toBeInTheDocument();
    expect(screen.queryByText(/limit reached/i)).not.toBeInTheDocument();
  });

  it("renders children on pro tier regardless of count", () => {
    mockTier("pro");
    render(
      <UsageLimit resource="bookingsPerMonth" currentCount={999} resourceLabel="bookings this month">
        <button>New Booking</button>
      </UsageLimit>
    );
    expect(screen.getByRole("button", { name: "New Booking" })).toBeInTheDocument();
    expect(screen.queryByText(/limit reached/i)).not.toBeInTheDocument();
  });

  it("renders children when under limit on free tier", () => {
    mockTier("free");
    render(
      <UsageLimit resource="bookingsPerMonth" currentCount={3} resourceLabel="bookings this month">
        <button>New Booking</button>
      </UsageLimit>
    );
    expect(screen.getByRole("button", { name: "New Booking" })).toBeInTheDocument();
    expect(screen.queryByText(/limit reached/i)).not.toBeInTheDocument();
  });

  it("shows upgrade nudge when 2 or fewer remaining", () => {
    mockTier("free");
    render(
      <UsageLimit resource="bookingsPerMonth" currentCount={3} resourceLabel="bookings this month">
        <button>New Booking</button>
      </UsageLimit>
    );
    // 5 - 3 = 2 remaining → show nudge
    expect(screen.getByText(/2 bookings this month remaining/i)).toBeInTheDocument();
  });

  it("does not show nudge when more than 2 remaining", () => {
    mockTier("free");
    render(
      <UsageLimit resource="bookingsPerMonth" currentCount={1} resourceLabel="bookings this month">
        <button>New Booking</button>
      </UsageLimit>
    );
    // 5 - 1 = 4 remaining → no nudge
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
  });

  it("shows limit-reached message and hides children when at limit", () => {
    mockTier("free");
    render(
      <UsageLimit resource="bookingsPerMonth" currentCount={5} resourceLabel="bookings this month">
        <button>New Booking</button>
      </UsageLimit>
    );
    expect(screen.queryByRole("button", { name: "New Booking" })).not.toBeInTheDocument();
    expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /upgrade to pro/i })).toHaveAttribute("href", "/pricing");
  });

  it("shows limit-reached when over the limit", () => {
    mockTier("free");
    render(
      <UsageLimit resource="bookingsPerMonth" currentCount={10} resourceLabel="bookings this month">
        <button>New Booking</button>
      </UsageLimit>
    );
    expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
  });

  it("applies packages limit correctly", () => {
    mockTier("free");
    render(
      <UsageLimit resource="packagesTotal" currentCount={2} resourceLabel="packages">
        <button>New Package</button>
      </UsageLimit>
    );
    expect(screen.queryByRole("button", { name: "New Package" })).not.toBeInTheDocument();
    expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
  });
});
