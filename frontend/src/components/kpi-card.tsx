import { GlassCard } from "./glass-card";
import { cn } from "../lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  icon: React.ReactNode;
  spark?: { v: number }[];
  accent?: string;
  style?: React.CSSProperties;
}

export function KpiCard({
  label,
  value,
  delta,
  icon,
  spark,
  accent = "var(--chart-1)",
  style,
}: KpiCardProps) {
  const isPositive = delta !== undefined && delta >= 0;

  return (
    <GlassCard sheen className="p-5 float-in" style={style}>
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
          }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
              isPositive
                ? "bg-dm-primary/15 text-dm-primary"
                : "bg-dm-destructive/15 text-dm-destructive"
            )}
          >
            {isPositive ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              </svg>
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs text-dm-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-semibold text-dm-foreground tracking-tight tabular-nums">
        {value}
      </p>
      {spark && spark.length > 0 && (
        <div className="h-10 mt-3 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={accent}
                strokeWidth={1.5}
                fill={`url(#spark-${label.replace(/\s/g, "")})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}
