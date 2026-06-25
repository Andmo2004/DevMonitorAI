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
import type { DailyUsage } from "../../types/api";

interface CostBarChartProps {
  data: DailyUsage[];
}

export function CostBarChart({ data }: CostBarChartProps) {
  if (!data.length) {
    return (
      <div className="h-60 flex items-center justify-center text-dm-muted-foreground text-sm">
        Sin datos de coste
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
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
          tickFormatter={(v: number) => `${v.toFixed(1)}€`}
        />
        <Tooltip content={<GlassTooltip />} />
        <Bar
          dataKey="cost_eur"
          name="Coste (€)"
          fill="var(--chart-2)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
