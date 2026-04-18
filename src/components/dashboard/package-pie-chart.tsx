"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import type { PackageSlice } from "@/lib/utils/analytics";

const COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface PackagePieChartProps {
  data: PackageSlice[];
  currency: string;
}

export function PackagePieChart({ data, currency }: PackagePieChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Package Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px]">
          <p className="text-sm text-muted-foreground">
            No package data yet. Bookings will appear here once confirmed.
          </p>
        </CardContent>
      </Card>
    );
  }

  // data is sorted by revenue descending — most valuable is first
  const mostValuable = data[0];
  const mostPopular = [...data].sort((a, b) => b.count - a.count)[0];

  const annotation =
    mostPopular.label === mostValuable.label
      ? `${mostValuable.label} leads in both bookings and revenue.`
      : `Most booked: ${mostPopular.label} · Top earner: ${mostValuable.label}`;

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Package Breakdown
        </CardTitle>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{annotation}</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={75}
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLOURS[index % COLOURS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, entry) => [
                `${formatCurrency(Number(value ?? 0), currency)} · ${entry.payload.count} ${entry.payload.count === 1 ? "booking" : "bookings"}`,
                entry.payload.label,
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
