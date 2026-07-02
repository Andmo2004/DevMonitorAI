import { useState } from "react";
import { GlassCard } from "./glass-card";
import { Button } from "./button";
import { generateInsight, getLatestInsight } from "../api/client";
import type { InsightResponse } from "../types/api";

interface InsightPanelProps {
  initialInsight?: InsightResponse | null;
}

export function InsightPanel({ initialInsight }: InsightPanelProps) {
  const [insight, setInsight] = useState<InsightResponse | null>(
    initialInsight ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateInsight("week");
      setInsight(data);
    } catch (err) {
      setError("Error al generar el insight. Verifica que la API de Anthropic está configurada.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const data = await getLatestInsight();
      if (data) setInsight(data);
    } catch {
      // Silently fail on refresh
    }
  };

  return (
    <GlassCard className="p-5 float-in" style={{ animationDelay: "500ms" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-dm-secondary flex items-center justify-center">
            <svg className="w-4 h-4 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dm-foreground">
              Insight IA Semanal
            </h3>
            <p className="text-xs text-dm-muted-foreground">
              Análisis generado por Claude
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg text-dm-muted-foreground hover:text-dm-foreground hover:bg-white/5 transition-colors"
            title="Actualizar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
          <Button
            onClick={handleGenerate}
            loading={loading}
            disabled={loading}
            icon={
              !loading ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" />
                </svg>
              ) : undefined
            }
          >
            {loading ? "Generando…" : "Generar informe"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-dm-destructive/10 border border-dm-destructive/20 text-dm-destructive text-xs">
          {error}
        </div>
      )}

      {insight ? (
        <div className="space-y-3">
          <div className="text-xs text-dm-muted-foreground">
            Generado el{" "}
            {new Date(insight.created_at).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" · "}
            Modelo: {insight.model_used}
          </div>
          <div className="text-sm text-dm-foreground/90 leading-relaxed whitespace-pre-line border-l-2 border-dm-primary/30 pl-4">
            {insight.content}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-dm-muted-foreground text-sm">
          <p className="mb-2">No hay insights generados aún.</p>
          <p className="text-xs">
            Pulsa "Generar informe" para crear un análisis con IA.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
