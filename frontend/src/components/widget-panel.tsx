import { GlassCard } from "./glass-card";
import { cn } from "../lib/utils";

interface WidgetPanelProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  live?: boolean;
  style?: React.CSSProperties;
}

export function WidgetPanel({
  title,
  subtitle,
  icon,
  children,
  className,
  live = false,
  style,
}: WidgetPanelProps) {
  return (
    <GlassCard className={cn("p-5 float-in flex flex-col", className)} style={style}>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-dm-secondary flex items-center justify-center text-dm-primary">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dm-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-dm-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {live && (
          <div className="flex items-center gap-1.5">
            <div className="live-dot" />
            <span className="text-[10px] font-medium text-dm-primary uppercase tracking-wider">
              Live
            </span>
          </div>
        )}
      </header>
      <div className="flex-1">{children}</div>
    </GlassCard>
  );
}
