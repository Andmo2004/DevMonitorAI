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
    <ResponsiveContainer width="100%" height={240} debounce={100}>
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
          width={50}
          tickFormatter={(v: any) => {
            const num = Number(v);
            return isNaN(num) ? "0.00€" : `${num.toFixed(2)}€`;
          }}
        />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: 'var(--secondary)', opacity: 0.2 }} />
        <Bar
          dataKey="cost_eur"
          name="Coste (€)"
          fill="var(--chart-9)"
          radius={[6, 6, 0, 0]}
          minPointSize={2}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
