"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Point = { date: string; amount: number };

export function PriceChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => new Date(d).toLocaleDateString("de-DE", { month: "short", year: "2-digit" })}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          width={56}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toLocaleString("de-DE")} €`}
        />
        <Tooltip
          labelFormatter={(d) => new Date(String(d)).toLocaleDateString("de-DE")}
          formatter={(value) => [
            `${Number(value).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €`,
            "Preis",
          ]}
          contentStyle={{
            background: "rgba(36, 27, 82, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 12,
            backdropFilter: "blur(8px)",
          }}
          itemStyle={{ color: "#ffffff" }}
          labelStyle={{ color: "rgba(255, 255, 255, 0.7)" }}
        />
        <Line type="stepAfter" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
