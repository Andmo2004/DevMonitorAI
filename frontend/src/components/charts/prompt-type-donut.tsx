import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { GlassTooltip } from "./glass-tooltip";
import type { PromptTypeDistribution } from "../../types/api";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
];

const LABEL_MAP: Record<string, string> = {
  code_generation: "Generación",
  refactoring: "Refactoring",
  debugging: "Debugging",
  explanation: "Explicación",
  boilerplate: "Boilerplate",
  testing: "Testing",
  documentation: "Documentación",
  other: "Otro",
};

import { memo } from "react";

interface PromptTypeDonutProps {
  data: PromptTypeDistribution[];
}

export const PromptTypeDonut = memo(function PromptTypeDonut({ data }: PromptTypeDonutProps) {
  if (!data.length) {
    return (
      <div className="h-60 flex items-center justify-center text-dm-muted-foreground text-sm">
        Sin datos de distribución
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: LABEL_MAP[d.prompt_type] || d.prompt_type,
    value: d.count,
    percentage: d.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={240} debounce={100}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
          isAnimationActive={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<GlassTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
          formatter={(value: string) => (
            <span className="text-dm-muted-foreground text-xs">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});
