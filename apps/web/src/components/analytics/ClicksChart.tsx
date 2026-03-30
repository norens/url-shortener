"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: { date: string; clicks: number }[];
  period?: string;
}

const periodLabels: Record<string, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "365d": "last 365 days",
  all: "all time",
};

export function ClicksChart({ data, period = "7d" }: Props) {
  const isHourly = period === "24h";
  const heading = `Clicks (${periodLabels[period] ?? period})`;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {heading}
      </h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-100 dark:stroke-gray-800"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickFormatter={(v) => {
                if (isHourly) {
                  const d = new Date(v.length <= 13 ? `${v}:00:00` : v);
                  return d.toLocaleTimeString("en", {
                    hour: "numeric",
                    hour12: true,
                  });
                }
                return new Date(v).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={(v) => {
                if (isHourly) {
                  const d = new Date(
                    typeof v === "string" && v.length <= 13 ? `${v}:00:00` : v,
                  );
                  return d.toLocaleString("en", {
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                }
                return new Date(v).toLocaleDateString("en", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
              }}
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, fill: "#2563eb" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
