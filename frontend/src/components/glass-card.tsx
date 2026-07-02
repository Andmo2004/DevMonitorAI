import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  sheen?: boolean;
  material?: "thin" | "regular" | "thick";
}

export function GlassCard({
  className,
  hover = true,
  sheen = false,
  material = "regular",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-3xl",
        material === "thick" && "glass-thick",
        material === "thin" && "glass-thin",
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
