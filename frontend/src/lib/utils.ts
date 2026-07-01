/**
 * Utility functions for Glasstics frontend.
 */

/**
 * Concatenates class names, filtering out falsy values.
 * Lightweight alternative to clsx/tailwind-merge.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a number as EUR currency.
 */
export function formatEUR(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a large number with dot separators (Spanish locale).
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(value);
}

/**
 * Format a compact number (e.g., 12.4K, 1.2M).
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/**
 * Format a percentage with one decimal.
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Format an ISO datetime string to a short locale representation.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Format an ISO datetime string to time (HH:MM).
 */
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an ISO datetime string to full datetime.
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
