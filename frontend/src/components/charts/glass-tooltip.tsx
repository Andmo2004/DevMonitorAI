import type { TooltipProps } from "recharts";

/**
 * Custom Recharts tooltip with glass surface styling.
 */
export function GlassTooltip({
  active,
  payload,
  label,
}: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass rounded-xl px-4 py-3 text-sm border border-dm-glass-border shadow-xl">
      <p className="text-dm-muted-foreground text-xs font-medium mb-1.5">
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-dm-muted-foreground">{entry.name}:</span>
          <span className="text-dm-foreground font-medium tabular-nums">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString("es-ES")
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
