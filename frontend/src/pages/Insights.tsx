import { useState, useEffect } from "react";
import { GlassCard } from "../components/glass-card";
import { Button } from "../components/button";
import { generateInsight, getLatestInsight, chatWithInsights } from "../api/client";
import type { InsightResponse, ChatResponse } from "../types/api";
import { cn } from "../lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  tokensUsed?: number;
}

const Insights = () => {
  const [insights, setInsights] = useState<InsightResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question || chatLoading) return;

    // Add user message
    const userMsg: ChatMessage = { role: "user", content: question };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const response: ChatResponse = await chatWithInsights(question);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.answer,
        tokensUsed: response.tokens_used,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatError("Error al obtener respuesta del analista IA.");
      console.error(err);
    } finally {
      setChatLoading(false);
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
          <Button
            onClick={() => handleGenerate("week")}
            loading={generating}
            disabled={generating}
            icon={
              !generating ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" />
                </svg>
              ) : undefined
            }
          >
            {generating ? "Generando…" : "Generar informe semanal"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleGenerate("month")}
            disabled={generating}
          >
            Informe mensual
          </Button>
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
      
      {/* Chat Section */}
      <GlassCard className="p-5 float-in" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-dm-primary/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-dm-foreground">
                  Chat con Analista IA
                </h4>
                <span className="text-[10px] text-dm-muted-foreground">
                  Pregunta sobre tus insights
                </span>
              </div>
            </div>

            {/* Chat messages */}
            {chatMessages.length > 0 ? (
              <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2.5",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-dm-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed",
                        msg.role === "user"
                          ? "bg-dm-primary text-white rounded-br-md"
                          : "bg-white/5 border border-dm-glass-border text-dm-foreground/90 rounded-bl-md"
                      )}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                      {msg.tokensUsed && (
                        <p className="text-[9px] mt-1.5 opacity-50">
                          {msg.tokensUsed} tokens
                        </p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-full bg-dm-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-dm-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-dm-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-dm-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" />
                      </svg>
                    </div>
                    <div className="bg-white/5 border border-dm-glass-border rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-dm-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-dm-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-dm-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-dm-muted-foreground text-xs">
                No hay mensajes aún. ¡Pregúntame algo!
              </div>
            )}

            {chatError && (
              <div className="mb-3 p-2.5 rounded-xl bg-dm-destructive/10 border border-dm-destructive/20 text-dm-destructive text-xs">
                {chatError}
              </div>
            )}

            {/* Chat input */}
            <form onSubmit={handleChatSubmit} className="flex items-center gap-2 mt-auto">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pregunta algo al analista..."
                disabled={chatLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-dm-foreground placeholder:text-dm-muted-foreground/70 focus:outline-none focus:border-dm-primary/50 focus:bg-white dark:focus:bg-black/20 transition-colors duration-200 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-dm-primary text-white hover:opacity-90 transition-opacity disabled:opacity-30 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </GlassCard>
    </div>
  );
};

export default Insights;
