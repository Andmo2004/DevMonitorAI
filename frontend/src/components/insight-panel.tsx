import { useState } from "react";
import { GlassCard } from "./glass-card";
import { generateInsight, getLatestInsight, chatWithInsights } from "../api/client";
import type { InsightResponse, ChatResponse } from "../types/api";
import { cn } from "../lib/utils";

interface InsightPanelProps {
  initialInsight?: InsightResponse | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  tokensUsed?: number;
}

export function InsightPanel({ initialInsight }: InsightPanelProps) {
  const [insight, setInsight] = useState<InsightResponse | null>(
    initialInsight ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

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
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dm-primary text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 glow-active"
          >
            {loading ? (
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
                Generar informe
              </>
            )}
          </button>
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

      {/* ─── Chat Section ─── */}
      <div className="mt-6 pt-5 border-t border-dm-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-dm-primary/15 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-dm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <h4 className="text-xs font-semibold text-dm-foreground">
            Chat con Analista IA
          </h4>
          <span className="text-[10px] text-dm-muted-foreground">
            Pregunta sobre los datos del dashboard
          </span>
        </div>

        {/* Chat messages */}
        {chatMessages.length > 0 && (
          <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
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
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed",
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
        )}

        {chatError && (
          <div className="mb-3 p-2.5 rounded-xl bg-dm-destructive/10 border border-dm-destructive/20 text-dm-destructive text-xs">
            {chatError}
          </div>
        )}

        {/* Chat input */}
        <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="¿Cuál es la tendencia de costes? ¿Qué usuario consume más?"
            disabled={chatLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-dm-glass-border text-sm text-dm-foreground placeholder:text-dm-muted-foreground/50 focus:outline-none focus:border-dm-primary/50 transition-colors disabled:opacity-50"
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
      </div>
    </GlassCard>
  );
}
