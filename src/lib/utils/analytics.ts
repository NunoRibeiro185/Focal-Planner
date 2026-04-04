import type { BookingStatus, LeadSource } from "@/lib/types";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface AnalyticsBooking {
  status: BookingStatus;
  event_date: string; // "YYYY-MM-DD"
  total_price: number;
  package_version_id: string;
  lead_source: LeadSource | null;
  package_version: {
    version_number: number;
    currency: string;
    package_template: {
      name: string;
    } | null;
  } | null;
}

export interface LeadSourceSlice {
  source: LeadSource;
  count: number;
}

export interface YearlyStats {
  projectedRevenue: number;
  avgBookingValue: number;
  bestSellingPackage: string | null;
  inquiryCount: number;
  bookedCount: number;
  /** null when there are zero inquiries (avoids division by zero) */
  conversionRate: number | null;
  currency: string;
  /** Total of all photographer-paid expenses for the year. */
  totalExpenses: number;
  /** projectedRevenue minus totalExpenses. */
  netProfit: number;
}

export interface MonthRevenue {
  month: number; // 1–12
  revenue: number;
}

export interface PackageSlice {
  label: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXCLUDED = new Set<BookingStatus>(["inquiry", "cancelled"]);

/** Bookings that count towards revenue / booking metrics */
function qualifying(bookings: AnalyticsBooking[]): AnalyticsBooking[] {
  return bookings.filter((b) => !EXCLUDED.has(b.status));
}

function packageLabel(b: AnalyticsBooking): string {
  const name = b.package_version?.package_template?.name ?? "Unknown";
  const version = b.package_version?.version_number ?? 0;
  return `${name} v${version}`;
}

// ---------------------------------------------------------------------------
// Computation functions (pure — no I/O, fully testable)
// ---------------------------------------------------------------------------

export function computeYearlyStats(
  bookings: AnalyticsBooking[],
  totalPhotographerExpenses: number = 0
): YearlyStats {
  const booked = qualifying(bookings);
  const inquiryCount = bookings.filter((b) => b.status === "inquiry").length;
  const bookedCount = booked.length;

  const projectedRevenue = booked.reduce((sum, b) => sum + b.total_price, 0);
  const avgBookingValue = bookedCount > 0 ? projectedRevenue / bookedCount : 0;

  // Best-selling package: version with the most bookings
  const countByLabel = new Map<string, number>();
  for (const b of booked) {
    const label = packageLabel(b);
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
  }
  let bestSellingPackage: string | null = null;
  let bestCount = 0;
  for (const [label, count] of countByLabel) {
    if (count > bestCount) {
      bestCount = count;
      bestSellingPackage = label;
    }
  }

  const conversionRate =
    bookings.length > 0 ? (bookedCount / bookings.length) * 100 : null;

  // Currency: from the first qualifying booking's package_version, fallback EUR
  const currency =
    booked[0]?.package_version?.currency ??
    bookings[0]?.package_version?.currency ??
    "EUR";

  return {
    projectedRevenue,
    avgBookingValue,
    bestSellingPackage,
    inquiryCount,
    bookedCount,
    conversionRate,
    currency,
    totalExpenses: totalPhotographerExpenses,
    netProfit: projectedRevenue - totalPhotographerExpenses,
  };
}

export function computeRevenueByMonth(
  bookings: AnalyticsBooking[]
): MonthRevenue[] {
  const revenueMap = new Map<number, number>();
  for (const b of qualifying(bookings)) {
    const month = parseInt(b.event_date.slice(5, 7), 10); // "YYYY-MM-DD" → month
    revenueMap.set(month, (revenueMap.get(month) ?? 0) + b.total_price);
  }

  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenue: revenueMap.get(i + 1) ?? 0,
  }));
}

export function computePackageBreakdown(
  bookings: AnalyticsBooking[]
): PackageSlice[] {
  const countByLabel = new Map<string, number>();
  for (const b of qualifying(bookings)) {
    const label = packageLabel(b);
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
  }

  return Array.from(countByLabel.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Computes how many qualifying bookings (non-inquiry, non-cancelled) came
 * from each lead source. Bookings with a null lead_source are omitted.
 * Results are sorted descending by count.
 */
export function computeLeadSourceBreakdown(
  bookings: AnalyticsBooking[]
): LeadSourceSlice[] {
  const countBySource = new Map<LeadSource, number>();
  for (const b of qualifying(bookings)) {
    if (b.lead_source === null) continue;
    countBySource.set(
      b.lead_source,
      (countBySource.get(b.lead_source) ?? 0) + 1
    );
  }

  return Array.from(countBySource.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
