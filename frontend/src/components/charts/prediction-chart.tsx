import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { GlassTooltip } from "./glass-tooltip";
import type { PredictionPoint } from "../../types/api";

import { memo } from "react";

interface PredictionChartProps {
  data: PredictionPoint[];
  unit: string;
  metric: string;
}

export const PredictionChart = memo(function PredictionChart({ data, unit, metric }: PredictionChartProps) {
  if (!data.length) {
    return (
      <div className="h-80 flex items-center justify-center text-dm-muted-foreground text-sm">
        Sin datos de predicción disponibles
      </div>
    );
  }

  // Encontrar la frontera entre datos reales y predicciones
  const lastRealIndex = data.findLastIndex((d) => !d.is_prediction);
  const boundaryDate =
    lastRealIndex >= 0
      ? new Date(data[lastRealIndex].date).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
        })
      : undefined;

  const formatted = data.map((d) => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
  }));

  const isTokens = metric === "tokens";
  const gradientId = `gradientPred_${metric}`;
  const gradientUpperId = `gradientUpper_${metric}`;
  const gradientLowerId = `gradientLower_${metric}`;

  return (
    <ResponsiveContainer width="100%" height={320} debounce={100}>
      <AreaChart
        data={formatted}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
      >
        <defs>
          {/* Gradiente para la banda optimista (verde) */}
          <linearGradient id={gradientUpperId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          {/* Gradiente para la banda pesimista (rojo) */}
          <linearGradient id={gradientLowerId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.02} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.25} />
          </linearGradient>
          {/* Gradiente para la línea central */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
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
          width={80}
          tickFormatter={(v: number) => {
            if (isTokens) {
              return v >= 1000 ? `${(v / 1000).toFixed(0)}K tokens` : `${v} tokens`;
            }
            return `€${v.toFixed(2)}`;
          }}
        />
        <Tooltip content={<GlassTooltip />} />

        {/* Línea divisoria entre real y predicción */}
        {boundaryDate && (
          <ReferenceLine
            x={boundaryDate}
            stroke="var(--muted-foreground)"
            strokeDasharray="6 4"
            strokeOpacity={0.4}
            label={{
              value: "Predicción →",
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 10,
            }}
          />
        )}

        {/* Banda superior (optimista - verde) */}
        <Area
          type="monotone"
          dataKey="upper_bound"
          name="Optimista"
          unit={unit === "EUR" ? "€" : unit}
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="4 2"
          strokeOpacity={0.5}
          fill={`url(#${gradientUpperId})`}
          isAnimationActive={false}
        />

        {/* Línea central (predicción) */}
        <Area
          type="monotone"
          dataKey="value"
          name="Predicción"
          unit={unit === "EUR" ? "€" : unit}
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />

        {/* Banda inferior (pesimista - rojo) */}
        <Area
          type="monotone"
          dataKey="lower_bound"
          name="Pesimista"
          unit={unit === "EUR" ? "€" : unit}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="4 2"
          strokeOpacity={0.5}
          fill={`url(#${gradientLowerId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
