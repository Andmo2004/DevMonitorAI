import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { GlassTooltip } from "./glass-tooltip";
import { formatCompact } from "../../lib/utils";
import { memo } from "react";

interface WeeklyAverageChartProps {
  data: { day: string; avgTokens: number; avgCommits: number }[];
}

export const WeeklyAverageChart = memo(function WeeklyAverageChart({ data }: WeeklyAverageChartProps) {
  if (!data.length) {
    return (
      <div className="h-60 flex items-center justify-center text-dm-muted-foreground text-sm">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240} debounce={100}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(160, 160, 200, 0.08)"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 500 }}
          axisLine={{ stroke: "rgba(160, 160, 200, 0.1)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="tokens"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <YAxis
          yAxisId="commits"
          orientation="right"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => String(v)}
        />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: 'var(--secondary)', opacity: 0.2 }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Bar
          yAxisId="tokens"
          dataKey="avgTokens"
          name="Tokens (Promedio)"
          fill="var(--primary)"
          radius={[6, 6, 0, 0]}
          barSize={30}
          isAnimationActive={false}
        />
        <Line
          yAxisId="commits"
          type="monotone"
          dataKey="avgCommits"
          name="Git Pushes (Promedio)"
          stroke="var(--chart-9)"
          strokeWidth={2.5}
          dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
