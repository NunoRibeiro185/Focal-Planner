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
    <div className="space-y-3">
      {/* ── Financial headline ─────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden">
        <HeadlineStat
          label="Expected Income"
          value={formatCurrency(projectedRevenue, currency)}
        />
        <HeadlineStat
          label="Take-Home"
          value={formatCurrency(netProfit, currency)}
        />
      </div>

      {/* ── Supporting context ─────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SupportStat
          label="Per Wedding"
          value={formatCurrency(avgBookingValue, currency)}
        />
        <SupportStat
          label="Expenses"
          value={formatCurrency(totalExpenses, currency)}
        />
        <SupportStat
          label="Top Package"
          value={bestSellingPackage ?? "—"}
        />
      </div>

      {/* ── Booking pipeline ───────────────────────────────────────────── */}
      <div className="flex items-center bg-muted/50 rounded-xl overflow-hidden divide-x divide-border">
        <PipelineStep label="Inquiries" value={String(inquiryCount)} />
        <PipelineArrow />
        <PipelineStep label="Bookings" value={String(bookedCount)} />
        <PipelineArrow />
        <PipelineStep
          label="Conversion"
          value={
            conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "—"
          }
        />
      </div>
    </div>
  );
}

function HeadlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-7 py-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className="font-heading text-4xl font-bold tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}

function SupportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function PipelineStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 py-5 text-center">
      <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1.5">
        {label}
      </p>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="px-3 py-5 text-muted-foreground/30 text-sm select-none">
      →
    </div>
  );
}
