import { useState, useEffect, useRef } from "react";
import { GlassCard } from "./glass-card";
import { getRecentEvents } from "../api/client";
import type { AIEventResponse } from "../types/api";
import { formatDateTime, cn } from "../lib/utils";

const PROMPT_TYPE_LABELS: Record<string, string> = {
  code_generation: "Generación",
  refactoring: "Refactoring",
  debugging: "Debug",
  explanation: "Explicación",
  boilerplate: "Boilerplate",
  testing: "Testing",
  documentation: "Docs",
  other: "Otro",
};

const PROMPT_TYPE_COLORS: Record<string, string> = {
  code_generation: "bg-chart-1/20 text-chart-1",
  refactoring: "bg-chart-2/20 text-chart-2",
  debugging: "bg-dm-destructive/20 text-dm-destructive",
  explanation: "bg-chart-3/20 text-chart-3",
  boilerplate: "bg-chart-4/20 text-chart-4",
  testing: "bg-dm-success/20 text-dm-success",
  documentation: "bg-chart-5/20 text-chart-5",
  other: "bg-dm-muted-foreground/20 text-dm-muted-foreground",
};

interface EventFeedProps {
  pollInterval?: number; // ms
  userId?: number;
}

export function EventFeed({ pollInterval = 5000, userId }: EventFeedProps) {
  const [events, setEvents] = useState<AIEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const prevIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async () => {
      try {
        const data = await getRecentEvents(20, userId);
        if (!mounted) return;

        // Detect new events for highlight animation
        const currentIds = new Set(data.map((e) => e.id));
        const fresh = new Set<number>();
        currentIds.forEach((id) => {
          if (!prevIdsRef.current.has(id)) fresh.add(id);
        });
        prevIdsRef.current = currentIds;

        if (fresh.size > 0 && events.length > 0) {
          setNewIds(fresh);
          setTimeout(() => setNewIds(new Set()), 2500);
        }

        setEvents(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching events:", err);
        if (mounted) setLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, pollInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollInterval, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GlassCard className="p-5 float-in" style={{ animationDelay: "600ms" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-dm-secondary flex items-center justify-center">
            <svg className="w-4 h-4 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dm-foreground">
              Feed de Eventos
            </h3>
            <p className="text-xs text-dm-muted-foreground">
              Últimos 20 eventos · Polling cada {pollInterval / 1000}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="live-dot" />
          <span className="text-[10px] font-medium text-dm-primary uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-dm-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-dm-muted-foreground text-sm">
          No hay eventos registrados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-dm-border">
                <th className="text-left py-2 px-2 text-dm-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  Tipo
                </th>
                <th className="text-left py-2 px-2 text-dm-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  Modelo
                </th>
                <th className="text-right py-2 px-2 text-dm-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  Tokens
                </th>
                <th className="text-right py-2 px-2 text-dm-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  Coste
                </th>
                <th className="text-right py-2 px-2 text-dm-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  Hora
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className={cn(
                    "border-b border-dm-border/50 transition-colors",
                    newIds.has(event.id) && "row-highlight"
                  )}
                >
                  <td className="py-2 px-2">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium",
                        PROMPT_TYPE_COLORS[event.prompt_type] ||
                          "bg-dm-secondary text-dm-muted-foreground"
                      )}
                    >
                      {PROMPT_TYPE_LABELS[event.prompt_type] || event.prompt_type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-dm-muted-foreground font-mono text-[11px]">
                    {event.model_id}
                  </td>
                  <td className="py-2 px-2 text-right text-dm-foreground tabular-nums">
                    {(event.tokens_in + event.tokens_out).toLocaleString("es-ES")}
                  </td>
                  <td className="py-2 px-2 text-right text-dm-foreground tabular-nums">
                    {event.cost_eur.toFixed(4)}€
                  </td>
                  <td className="py-2 px-2 text-right text-dm-muted-foreground">
                    {formatDateTime(event.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
