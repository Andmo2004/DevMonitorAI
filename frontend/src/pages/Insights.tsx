import { useState, useEffect } from "react";
import { GlassCard } from "../components/glass-card";
import { generateInsight, getLatestInsight } from "../api/client";
import type { InsightResponse } from "../types/api";

const Insights = () => {
  const [insights, setInsights] = useState<InsightResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const latest = await getLatestInsight();
      if (latest) {
        setInsights([latest]);
      }
    } catch {
      // No insights yet
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (period: "week" | "month") => {
    setGenerating(true);
    setError(null);
    try {
      const insight = await generateInsight(period);
      setInsights((prev) => [insight, ...prev]);
      setExpandedId(insight.id);
    } catch (err) {
      setError(
        "Error al generar el insight. Verifica que la API de Anthropic está configurada."
      );
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 float-in">
        <div>
          <h1 className="text-2xl font-semibold text-dm-foreground tracking-tight">
            Insights IA
          </h1>
          <p className="text-sm text-dm-muted-foreground mt-1">
            Informes de management generados por Claude AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerate("week")}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dm-primary text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 glow-active"
          >
            {generating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generando…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" />
                </svg>
                Generar informe semanal
              </>
            )}
          </button>
          <button
            onClick={() => handleGenerate("month")}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-dm-foreground text-xs font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Informe mensual
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="glass rounded-2xl p-4 border border-dm-destructive/30 text-dm-destructive text-sm float-in">
          {error}
        </div>
      )}

      {/* How it works */}
      <GlassCard className="p-5 float-in" style={{ animationDelay: "60ms" }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-dm-primary/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dm-foreground mb-1">
              IA analizando los datos de IA
            </h3>
            <p className="text-xs text-dm-muted-foreground leading-relaxed">
              Al pulsar "Generar informe", el sistema recoge los KPIs del período
              seleccionado y los envía a Claude API para obtener un análisis en
              lenguaje natural: patrones de uso, recomendaciones de management,
              alertas de coste y sugerencias de optimización.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Insights list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass rounded-3xl p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <GlassCard className="p-12 text-center float-in" style={{ animationDelay: "120ms" }}>
          <div className="w-16 h-16 rounded-2xl bg-dm-secondary mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-dm-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-dm-foreground font-medium mb-2">
            No hay informes generados aún
          </p>
          <p className="text-xs text-dm-muted-foreground max-w-sm mx-auto">
            Pulsa "Generar informe semanal" para crear tu primer análisis de
            management con inteligencia artificial.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, i) => (
            <GlassCard
              key={insight.id}
              className="float-in overflow-hidden"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <button
                onClick={() =>
                  setExpandedId(
                    expandedId === insight.id ? null : insight.id
                  )
                }
                className="w-full p-5 text-left flex items-center justify-between hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-dm-primary/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-dm-foreground">
                      Informe de management
                    </p>
                    <p className="text-xs text-dm-muted-foreground">
                      {new Date(insight.created_at).toLocaleDateString(
                        "es-ES",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                      {" · "}
                      {insight.model_used}
                      {insight.tokens_used && ` · ${insight.tokens_used} tokens`}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-dm-muted-foreground transition-transform duration-200 ${
                    expandedId === insight.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {expandedId === insight.id && (
                <div className="px-5 pb-5 border-t border-dm-border">
                  <div className="pt-4 text-sm text-dm-foreground/90 leading-relaxed whitespace-pre-line border-l-2 border-dm-primary/30 pl-4">
                    {insight.content}
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Insights;
