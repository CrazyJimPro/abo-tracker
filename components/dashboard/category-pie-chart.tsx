"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Slice = { name: string; value: number; color: string };

export function CategoryPieChart({ data }: { data: Slice[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={105}
          paddingAngle={2}
          stroke="transparent"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            `${Number(value).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €`
          }
          contentStyle={{
            background: "rgba(36, 27, 82, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 12,
            backdropFilter: "blur(8px)",
          }}
          itemStyle={{ color: "#ffffff" }}
          labelStyle={{ color: "rgba(255, 255, 255, 0.7)" }}
        />
        <Legend wrapperStyle={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
