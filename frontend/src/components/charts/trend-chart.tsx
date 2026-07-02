import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { GlassTooltip } from "./glass-tooltip";
import type { DailyUsage } from "../../types/api";

import { memo } from "react";

interface TrendChartProps {
  data: DailyUsage[];
}

export const TrendChart = memo(function TrendChart({ data }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-dm-muted-foreground text-sm">
        Sin datos de tendencia
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={288} debounce={100}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradientTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(160, 160, 200, 0.08)"
          vertical={false}
        />
        <XAxis
          dataKey="displayDate"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(160, 160, 200, 0.1)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
          }
        />
        <Tooltip content={<GlassTooltip />} />
        <Area
          type="monotone"
          dataKey="tokens"
          name="Tokens"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#gradientTrend)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
