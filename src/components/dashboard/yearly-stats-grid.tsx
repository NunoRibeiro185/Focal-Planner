import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { YearlyStats } from "@/lib/utils/analytics";

interface YearlyStatsGridProps {
  stats: YearlyStats;
}

export function YearlyStatsGrid({ stats }: YearlyStatsGridProps) {
  const {
    projectedRevenue,
    avgBookingValue,
    bestSellingPackage,
    inquiryCount,
    bookedCount,
    conversionRate,
    currency,
    totalExpenses,
    netProfit,
  } = stats;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCell
        label="Projected Revenue"
        value={formatCurrency(projectedRevenue, currency)}
      />
      <StatCell label="Net Profit" value={formatCurrency(netProfit, currency)} />
      <StatCell label="Total Expenses" value={formatCurrency(totalExpenses, currency)} />
      <StatCell
        label="Avg. Booking Value"
        value={formatCurrency(avgBookingValue, currency)}
      />
      <StatCell
        label="Best Selling Package"
        value={bestSellingPackage ?? "—"}
      />
      <StatCell label="Inquiries" value={String(inquiryCount)} />
      <StatCell label="Booked" value={String(bookedCount)} />
      <StatCell
        label="Conversion Rate"
        value={conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "—"}
      />
    </div>
  );
}

function StatCell({
  label,
  value,
  comingSoon,
}: {
  label: string;
  value?: string;
  comingSoon?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        {comingSoon ? (
          <Badge variant="secondary" className="text-xs">
            Coming soon
          </Badge>
        ) : (
          <p className="text-xl font-bold truncate">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
