import { getBookingYears, getAnalyticsBookings } from "@/lib/queries/analytics";
import {
  computeYearlyStats,
  computeRevenueByMonth,
  computePackageBreakdown,
  computeLeadSourceBreakdown,
} from "@/lib/utils/analytics";
import { YearFilter } from "@/components/dashboard/year-filter";
import { YearlyStatsGrid } from "@/components/dashboard/yearly-stats-grid";
import { RevenueLineChart } from "@/components/dashboard/revenue-line-chart";
import { PackagePieChart } from "@/components/dashboard/package-pie-chart";
import { LeadSourceChart } from "@/components/insights/lead-source-chart";
import { Card, CardContent } from "@/components/ui/card";

interface InsightsPageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear;

  const [years, analyticsBookings] = await Promise.all([
    getBookingYears(),
    getAnalyticsBookings(selectedYear),
  ]);

  const availableYears =
    years.includes(selectedYear) ? years : [selectedYear, ...years];

  const stats = computeYearlyStats(analyticsBookings);
  const monthlyRevenue = computeRevenueByMonth(analyticsBookings);
  const packageBreakdown = computePackageBreakdown(analyticsBookings);
  const leadSourceBreakdown = computeLeadSourceBreakdown(analyticsBookings);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Insights</h1>
        <YearFilter years={availableYears} selectedYear={selectedYear} />
      </div>

      {analyticsBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No bookings found for {selectedYear}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Financial Health & Performance ── */}
          <YearlyStatsGrid stats={stats} />

          {/* ── Revenue + Lead Source ── */}
          <div className="grid gap-4 md:grid-cols-2">
            <RevenueLineChart data={monthlyRevenue} currency={stats.currency} />
            <LeadSourceChart data={leadSourceBreakdown} />
          </div>

          {/* ── Package Breakdown ── */}
          <PackagePieChart data={packageBreakdown} />
        </>
      )}
    </div>
  );
}
