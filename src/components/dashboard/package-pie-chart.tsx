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
import type { PackageSlice } from "@/lib/utils/analytics";

// Palette cycles through these colours for pie slices
const COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface PackagePieChartProps {
  data: PackageSlice[];
}

export function PackagePieChart({ data }: PackagePieChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Package Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px]">
          <p className="text-sm text-muted-foreground">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Package Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
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
              formatter={(value) => [Number(value ?? 0), "Bookings"]}
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
