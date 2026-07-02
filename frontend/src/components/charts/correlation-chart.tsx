import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { GlassTooltip } from "./glass-tooltip";
import type { CorrelationPoint } from "../../types/api";

import { memo } from "react";

interface CorrelationChartProps {
  data: CorrelationPoint[];
}

export const CorrelationChart = memo(function CorrelationChart({ data }: CorrelationChartProps) {
  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-dm-muted-foreground text-sm">
        No hay datos de correlación disponibles
      </div>
    );
  }

  // Format dates for display
  const formatted = data.map((d) => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={288} debounce={100}>
      <ComposedChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradientTokens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
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
          yAxisId="tokens"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
          }
        />
        <YAxis
          yAxisId="commits"
          orientation="right"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<GlassTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
        <Area
          yAxisId="tokens"
          type="monotone"
          dataKey="ai_tokens"
          name="Tokens IA"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#gradientTokens)"
          isAnimationActive={false}
        />
        <Bar
          yAxisId="commits"
          dataKey="git_commits"
          name="Commits Git"
          fill="var(--chart-9)"
          radius={[4, 4, 0, 0]}
          barSize={20}
          opacity={0.8}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
