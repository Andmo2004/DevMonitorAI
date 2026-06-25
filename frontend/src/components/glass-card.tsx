import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  sheen?: boolean;
}

export function GlassCard({
  className,
  hover = true,
  sheen = false,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-3xl",
        hover && "glass-hover",
        sheen && "glass-sheen",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
