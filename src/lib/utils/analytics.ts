import type { BookingStatus, LeadSource } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";

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
    version_name?: string;
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
  revenue: number;
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
  const versionLabel = b.package_version?.version_name ?? `v${b.package_version?.version_number ?? 0}`;
  return `${name} / ${versionLabel}`;
}

// ---------------------------------------------------------------------------
// Computation functions (pure — no I/O, fully testable)
// ---------------------------------------------------------------------------

export function computeYearlyStats(
  bookings: AnalyticsBooking[],
  totalPhotographerExpenses: number = 0
): YearlyStats {
  const booked = qualifying(bookings);
  const inquiryCount = bookings.length;
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
  const dataByLabel = new Map<string, { count: number; revenue: number }>();
  for (const b of qualifying(bookings)) {
    const label = packageLabel(b);
    const prev = dataByLabel.get(label) ?? { count: 0, revenue: 0 };
    dataByLabel.set(label, {
      count: prev.count + 1,
      revenue: prev.revenue + b.total_price,
    });
  }

  return Array.from(dataByLabel.entries())
    .map(([label, { count, revenue }]) => ({ label, count, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
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

// ---------------------------------------------------------------------------
// Insight summary
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface InsightSummary {
  headline: string;
  detail: string | null;
}

export function computeInsightSummary(
  stats: YearlyStats,
  monthlyRevenue: MonthRevenue[],
  selectedYear: number,
  priorYearRevenue: number | null,
): InsightSummary {
  const { projectedRevenue, bestSellingPackage, currency } = stats;

  const bestMonth = monthlyRevenue.reduce(
    (best, m) => (m.revenue > best.revenue ? m : best),
    monthlyRevenue[0],
  );
  const hasBestMonth = bestMonth && bestMonth.revenue > 0;

  let headline: string;

  if (priorYearRevenue !== null && priorYearRevenue > 0) {
    const diff = projectedRevenue - priorYearRevenue;
    const pct = Math.round((Math.abs(diff) / priorYearRevenue) * 100);

    if (pct < 2) {
      headline = `${selectedYear} is on track with last year — ${formatCurrency(projectedRevenue, currency)} in expected income.`;
    } else if (diff > 0) {
      headline = `Your best year yet — ${formatCurrency(projectedRevenue, currency)} in expected income, up ${pct}% from ${selectedYear - 1}.`;
    } else {
      headline = `Revenue is down ${pct}% from ${selectedYear - 1}, with ${formatCurrency(projectedRevenue, currency)} expected for the year.`;
    }
  } else {
    if (hasBestMonth) {
      headline = `${MONTH_NAMES[bestMonth.month - 1]} was your strongest month — ${formatCurrency(bestMonth.revenue, currency)} in revenue.`;
    } else {
      headline = `${formatCurrency(projectedRevenue, currency)} in expected income for ${selectedYear}.`;
    }
  }

  let detail: string | null = null;

  if (priorYearRevenue !== null && hasBestMonth) {
    detail = `${MONTH_NAMES[bestMonth.month - 1]} was your busiest stretch.`;
    if (bestSellingPackage) {
      detail = `${MONTH_NAMES[bestMonth.month - 1]} carried the most weight. ${bestSellingPackage} is your top package.`;
    }
  } else if (bestSellingPackage) {
    detail = `${bestSellingPackage} is bringing in most of your work.`;
  }

  return { headline, detail };
}
