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
import type { Engineer } from "@/types";
import { BAR_COLORS, BLUE } from "./constants";

export function ScoreChart({
  engineers,
  selectedLogin,
  onSelect,
}: {
  engineers: Engineer[];
  selectedLogin: string | null;
  onSelect: (eng: Engineer) => void;
}) {
  const data = [...engineers].reverse().map((eng) => ({
    login: eng.login,
    total: eng.total,
    _eng: eng,
  }));

  return (
    <ResponsiveContainer width="100%" height={engineers.length * 36 + 12}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="login"
          width={86}
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: "1px solid #e4e4e7",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "6px 10px",
          }}
          formatter={(value: number | undefined) => [
            (value ?? 0).toFixed(1),
            "Score",
          ]}
        />
        <Bar
          dataKey="total"
          radius={[0, 5, 5, 0]}
          barSize={18}
          onClick={(entry) => {
            const d = entry as unknown as { _eng: Engineer };
            if (d._eng) onSelect(d._eng);
          }}
          className="cursor-pointer"
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.login}
              fill={BAR_COLORS[engineers.length - 1 - i] ?? BLUE}
              opacity={
                selectedLogin && selectedLogin !== entry.login ? 0.35 : 1
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
