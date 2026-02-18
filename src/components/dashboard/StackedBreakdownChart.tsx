"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { EngineerBreakdown } from "@/types";
import { BLUE, EMERALD } from "./constants";

export function StackedBreakdownChart({
  breakdown,
}: {
  breakdown: EngineerBreakdown;
}) {
  const data = [
    {
      name: "Breakdown",
      pr: breakdown.pr_points,
      review: breakdown.review_points,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={24}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip
          cursor={false}
          contentStyle={{
            fontSize: 11,
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            padding: "4px 8px",
          }}
          formatter={(value: number | undefined, name?: string) => [
            (value ?? 0).toFixed(1),
            name === "pr" ? "PR pts" : "Review pts",
          ]}
        />
        <Bar
          dataKey="pr"
          stackId="a"
          fill={BLUE}
          radius={[5, 0, 0, 5]}
          barSize={14}
        />
        <Bar
          dataKey="review"
          stackId="a"
          fill={EMERALD}
          radius={[0, 5, 5, 0]}
          barSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
