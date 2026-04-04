"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeadSourceSlice } from "@/lib/utils/analytics";

const COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  weddingwire: "WeddingWire",
  google: "Google",
  referral: "Referral",
  other: "Other",
};

interface LeadSourceChartProps {
  data: LeadSourceSlice[];
}

export function LeadSourceChart({ data }: LeadSourceChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Lead Source
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px]">
          <p className="text-sm text-muted-foreground">
            No lead source data yet. Add sources to new bookings to see the breakdown.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((s) => ({
    name: SOURCE_LABELS[s.source] ?? s.source,
    count: s.count,
    source: s.source,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Lead Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [Number(value), "Bookings"]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLOURS[index % COLOURS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
