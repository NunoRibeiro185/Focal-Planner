import type { InsightSummary } from "@/lib/utils/analytics";

interface InsightSummaryProps {
  summary: InsightSummary;
}

export function InsightSummaryBlock({ summary }: InsightSummaryProps) {
  return (
    <div className="py-1">
      <p className="text-base leading-relaxed text-foreground/90 font-medium">
        {summary.headline}
      </p>
      {summary.detail && (
        <p className="text-sm leading-relaxed text-muted-foreground mt-0.5">
          {summary.detail}
        </p>
      )}
    </div>
  );
}
