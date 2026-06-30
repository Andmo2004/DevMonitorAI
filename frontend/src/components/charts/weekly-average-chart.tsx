import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { GlassTooltip } from "./glass-tooltip";
import { formatCompact } from "../../lib/utils";

interface WeeklyAverageChartProps {
  data: { day: string; avgTokens: number }[];
}

export function WeeklyAverageChart({ data }: WeeklyAverageChartProps) {
  if (!data.length) {
    return (
      <div className="h-60 flex items-center justify-center text-dm-muted-foreground text-sm">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: 'var(--secondary)', opacity: 0.2 }} />
        <Bar
          dataKey="avgTokens"
          name="Tokens (Promedio)"
          fill="var(--primary)"
          radius={[6, 6, 0, 0]}
          barSize={40}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
