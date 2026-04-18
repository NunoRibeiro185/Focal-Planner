import { getBookingYears, getAnalyticsBookings, getPriorYearRevenue } from "@/lib/queries/analytics";
import { getYearPhotographerExpenses } from "@/lib/queries/expenses";
import {
  computeYearlyStats,
  computeRevenueByMonth,
  computePackageBreakdown,
  computeLeadSourceBreakdown,
  computeInsightSummary,
} from "@/lib/utils/analytics";
import { YearFilter } from "@/components/dashboard/year-filter";
import { YearlyStatsGrid } from "@/components/dashboard/yearly-stats-grid";
import { RevenueLineChart } from "@/components/dashboard/revenue-line-chart";
import { PackagePieChart } from "@/components/dashboard/package-pie-chart";
import { LeadSourceChart } from "@/components/insights/lead-source-chart";
import { InsightSummaryBlock } from "@/components/insights/insight-summary";
import { Card, CardContent } from "@/components/ui/card";

interface InsightsPageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear;

  const [years, analyticsBookings, totalExpenses, priorYearRevenue] = await Promise.all([
    getBookingYears(),
    getAnalyticsBookings(selectedYear),
    getYearPhotographerExpenses(selectedYear),
    getPriorYearRevenue(selectedYear - 1),
  ]);

  const availableYears =
    years.includes(selectedYear) ? years : [selectedYear, ...years];

  const stats = computeYearlyStats(analyticsBookings, totalExpenses);
  const monthlyRevenue = computeRevenueByMonth(analyticsBookings);
  const packageBreakdown = computePackageBreakdown(analyticsBookings);
  const leadSourceBreakdown = computeLeadSourceBreakdown(analyticsBookings);
  const summary = computeInsightSummary(stats, monthlyRevenue, selectedYear, priorYearRevenue);

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
          {/* ── Summary lede ── */}
          <InsightSummaryBlock summary={summary} />

          {/* ── Financial Health & Performance ── */}
          <YearlyStatsGrid stats={stats} />

          {/* ── Revenue ── */}
          <RevenueLineChart data={monthlyRevenue} currency={stats.currency} />

          {/* ── Lead Source + Package Breakdown ── */}
          <div className="grid gap-4 md:grid-cols-2">
            <LeadSourceChart data={leadSourceBreakdown} />
            <PackagePieChart data={packageBreakdown} />
          </div>
        </>
      )}
    </div>
  );
}
