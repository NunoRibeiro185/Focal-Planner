import { describe, it, expect } from "vitest";
import {
  computeYearlyStats,
  computeRevenueByMonth,
  computePackageBreakdown,
  computeLeadSourceBreakdown,
  type AnalyticsBooking,
} from "@/lib/utils/analytics";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBooking(
  overrides: Partial<AnalyticsBooking> & { total_price?: number }
): AnalyticsBooking {
  return {
    status: "confirmed",
    event_date: "2025-06-15",
    total_price: 1000,
    package_version_id: "pv-1",
    lead_source: null,
    package_version: {
      version_number: 1,
      currency: "EUR",
      package_template: { name: "Wedding Full" },
    },
    ...overrides,
  };
}

const pv1 = {
  version_number: 1,
  currency: "EUR",
  package_template: { name: "Wedding Full" },
};
const pv2 = {
  version_number: 2,
  currency: "EUR",
  package_template: { name: "Wedding Full" },
};
const pv3 = {
  version_number: 1,
  currency: "EUR",
  package_template: { name: "Portrait Mini" },
};

// ---------------------------------------------------------------------------
// computeYearlyStats
// ---------------------------------------------------------------------------

describe("computeYearlyStats", () => {
  it("returns zero stats for an empty list", () => {
    const stats = computeYearlyStats([]);
    expect(stats.projectedRevenue).toBe(0);
    expect(stats.avgBookingValue).toBe(0);
    expect(stats.bookedCount).toBe(0);
    expect(stats.inquiryCount).toBe(0);
    expect(stats.conversionRate).toBeNull();
    expect(stats.bestSellingPackage).toBeNull();
    expect(stats.currency).toBe("EUR");
  });

  it("sums total_price of non-inquiry, non-cancelled bookings", () => {
    const bookings = [
      makeBooking({ status: "confirmed", total_price: 1000 }),
      makeBooking({ status: "shoot_completed", total_price: 1500 }),
      makeBooking({ status: "inquiry", total_price: 999 }), // excluded
      makeBooking({ status: "cancelled", total_price: 500 }), // excluded
    ];
    const { projectedRevenue } = computeYearlyStats(bookings);
    expect(projectedRevenue).toBe(2500);
  });

  it("computes correct average booking value", () => {
    const bookings = [
      makeBooking({ total_price: 1000 }),
      makeBooking({ total_price: 2000 }),
    ];
    const { avgBookingValue } = computeYearlyStats(bookings);
    expect(avgBookingValue).toBe(1500);
  });

  it("counts inquiries separately from booked", () => {
    const bookings = [
      makeBooking({ status: "inquiry" }),
      makeBooking({ status: "inquiry" }),
      makeBooking({ status: "confirmed" }),
    ];
    const { inquiryCount, bookedCount } = computeYearlyStats(bookings);
    expect(inquiryCount).toBe(2);
    expect(bookedCount).toBe(1);
  });

  it("calculates conversion rate as (booked / total bookings) * 100", () => {
    const bookings = [
      makeBooking({ status: "inquiry" }),
      makeBooking({ status: "cancelled" }),
      makeBooking({ status: "confirmed" }),
      makeBooking({ status: "confirmed" }),
    ];
    const { conversionRate } = computeYearlyStats(bookings);
    expect(conversionRate).toBe(50);
  });

  it("returns null conversion rate when there are no bookings at all", () => {
    const { conversionRate } = computeYearlyStats([]);
    expect(conversionRate).toBeNull();
  });

  it("identifies the best-selling package version by booking count", () => {
    const bookings = [
      makeBooking({ package_version_id: "pv-1", package_version: pv1 }),
      makeBooking({ package_version_id: "pv-1", package_version: pv1 }),
      makeBooking({ package_version_id: "pv-2", package_version: pv2 }),
    ];
    const { bestSellingPackage } = computeYearlyStats(bookings);
    expect(bestSellingPackage).toBe("Wedding Full v1");
  });

  it("excludes cancelled and inquiry bookings from best-selling calculation", () => {
    const bookings = [
      // inquiry has many "bookings" of pv3 but should be excluded
      makeBooking({ status: "inquiry", package_version: pv3 }),
      makeBooking({ status: "inquiry", package_version: pv3 }),
      makeBooking({ status: "inquiry", package_version: pv3 }),
      makeBooking({ status: "confirmed", package_version: pv1 }),
      makeBooking({ status: "confirmed", package_version: pv1 }),
    ];
    const { bestSellingPackage } = computeYearlyStats(bookings);
    expect(bestSellingPackage).toBe("Wedding Full v1");
  });

  it("uses currency from the first qualifying booking", () => {
    const bookings = [
      makeBooking({
        status: "confirmed",
        package_version: { ...pv1, currency: "GBP" },
      }),
    ];
    expect(computeYearlyStats(bookings).currency).toBe("GBP");
  });

  it("falls back to EUR when there are no qualifying bookings", () => {
    const bookings = [makeBooking({ status: "inquiry" })];
    // inquiry's currency is available as fallback
    expect(computeYearlyStats(bookings).currency).toBe("EUR");
  });
});

// ---------------------------------------------------------------------------
// computeRevenueByMonth
// ---------------------------------------------------------------------------

describe("computeRevenueByMonth", () => {
  it("always returns exactly 12 entries", () => {
    expect(computeRevenueByMonth([])).toHaveLength(12);
    expect(computeRevenueByMonth([makeBooking({})])).toHaveLength(12);
  });

  it("months are numbered 1–12", () => {
    const result = computeRevenueByMonth([]);
    expect(result[0].month).toBe(1);
    expect(result[11].month).toBe(12);
  });

  it("places a booking's revenue in the correct month slot", () => {
    const bookings = [makeBooking({ event_date: "2025-03-10", total_price: 1200 })];
    const march = computeRevenueByMonth(bookings).find((m) => m.month === 3)!;
    expect(march.revenue).toBe(1200);
  });

  it("months with no bookings have zero revenue", () => {
    const bookings = [makeBooking({ event_date: "2025-06-01" })];
    const result = computeRevenueByMonth(bookings);
    const emptyMonths = result.filter((m) => m.month !== 6);
    expect(emptyMonths.every((m) => m.revenue === 0)).toBe(true);
  });

  it("accumulates revenue for multiple bookings in the same month", () => {
    const bookings = [
      makeBooking({ event_date: "2025-08-01", total_price: 500 }),
      makeBooking({ event_date: "2025-08-20", total_price: 700 }),
    ];
    const august = computeRevenueByMonth(bookings).find((m) => m.month === 8)!;
    expect(august.revenue).toBe(1200);
  });

  it("excludes cancelled and inquiry bookings", () => {
    const bookings = [
      makeBooking({ event_date: "2025-05-01", status: "inquiry", total_price: 999 }),
      makeBooking({ event_date: "2025-05-01", status: "cancelled", total_price: 999 }),
    ];
    const may = computeRevenueByMonth(bookings).find((m) => m.month === 5)!;
    expect(may.revenue).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computePackageBreakdown
// ---------------------------------------------------------------------------

describe("computePackageBreakdown", () => {
  it("returns an empty array when there are no qualifying bookings", () => {
    expect(computePackageBreakdown([])).toEqual([]);
    const inquiries = [makeBooking({ status: "inquiry" })];
    expect(computePackageBreakdown(inquiries)).toEqual([]);
  });

  it("counts bookings per package version", () => {
    const bookings = [
      makeBooking({ package_version: pv1 }),
      makeBooking({ package_version: pv1 }),
      makeBooking({ package_version: pv2 }),
    ];
    const result = computePackageBreakdown(bookings);
    const wv1 = result.find((s) => s.label === "Wedding Full v1")!;
    const wv2 = result.find((s) => s.label === "Wedding Full v2")!;
    expect(wv1.count).toBe(2);
    expect(wv2.count).toBe(1);
  });

  it("labels slices as '{template name} v{version_number}'", () => {
    const bookings = [makeBooking({ package_version: pv3 })];
    const result = computePackageBreakdown(bookings);
    expect(result[0].label).toBe("Portrait Mini v1");
  });

  it("excludes cancelled and inquiry bookings", () => {
    const bookings = [
      makeBooking({ status: "inquiry", package_version: pv1 }),
      makeBooking({ status: "cancelled", package_version: pv1 }),
    ];
    expect(computePackageBreakdown(bookings)).toEqual([]);
  });

  it("sorts results descending by count", () => {
    const bookings = [
      makeBooking({ package_version: pv3 }),
      makeBooking({ package_version: pv1 }),
      makeBooking({ package_version: pv1 }),
    ];
    const result = computePackageBreakdown(bookings);
    expect(result[0].label).toBe("Wedding Full v1");
    expect(result[1].label).toBe("Portrait Mini v1");
  });
});

// ---------------------------------------------------------------------------
// computeLeadSourceBreakdown
// ---------------------------------------------------------------------------

describe("computeLeadSourceBreakdown", () => {
  it("returns an empty array for an empty booking list", () => {
    expect(computeLeadSourceBreakdown([])).toEqual([]);
  });

  it("omits bookings with null lead_source", () => {
    const bookings = [makeBooking({ lead_source: null })];
    expect(computeLeadSourceBreakdown(bookings)).toEqual([]);
  });

  it("excludes inquiry bookings", () => {
    const bookings = [
      makeBooking({ status: "inquiry", lead_source: "instagram" }),
    ];
    expect(computeLeadSourceBreakdown(bookings)).toEqual([]);
  });

  it("excludes cancelled bookings", () => {
    const bookings = [
      makeBooking({ status: "cancelled", lead_source: "google" }),
    ];
    expect(computeLeadSourceBreakdown(bookings)).toEqual([]);
  });

  it("counts qualifying bookings by lead source", () => {
    const bookings = [
      makeBooking({ lead_source: "instagram" }),
      makeBooking({ lead_source: "instagram" }),
      makeBooking({ lead_source: "google" }),
    ];
    const result = computeLeadSourceBreakdown(bookings);
    const ig = result.find((s) => s.source === "instagram")!;
    const g = result.find((s) => s.source === "google")!;
    expect(ig.count).toBe(2);
    expect(g.count).toBe(1);
  });

  it("sorts results descending by count", () => {
    const bookings = [
      makeBooking({ lead_source: "referral" }),
      makeBooking({ lead_source: "instagram" }),
      makeBooking({ lead_source: "instagram" }),
      makeBooking({ lead_source: "instagram" }),
      makeBooking({ lead_source: "google" }),
      makeBooking({ lead_source: "google" }),
    ];
    const result = computeLeadSourceBreakdown(bookings);
    expect(result[0].source).toBe("instagram");
    expect(result[1].source).toBe("google");
    expect(result[2].source).toBe("referral");
  });

  it("handles a mix of null and non-null lead sources", () => {
    const bookings = [
      makeBooking({ lead_source: "facebook" }),
      makeBooking({ lead_source: null }),
      makeBooking({ lead_source: "facebook" }),
    ];
    const result = computeLeadSourceBreakdown(bookings);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("facebook");
    expect(result[0].count).toBe(2);
  });
});
