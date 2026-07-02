import { useState, useEffect } from "react";
import { getPredictions, getUsers } from "../api/client";
import { PredictionChart } from "../components/charts/prediction-chart";
import { WidgetPanel } from "../components/widget-panel";
import { GlassCard } from "../components/glass-card";
import { cn } from "../lib/utils";
import type { PredictionResponse, UserResponse } from "../types/api";

const Predictions = () => {
  const [predictions, setPredictions] = useState<PredictionResponse | null>(
    null
  );
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(
    undefined
  );
  const [userSearch, setUserSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMetric, setActiveMetric] = useState<"tokens" | "cost">(
    "tokens"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar usuarios
  useEffect(() => {
    getUsers()
      .then((res) => setUsers(res.items || []))
      .catch(() => {});
  }, []);

  // Cargar predicciones
  useEffect(() => {
    setLoading(true);
    setError(null);
    getPredictions(selectedUserId)
      .then((data) => {
        setPredictions(data);
        setError(null);
      })
      .catch(() => {
        setError(
          "Error al cargar las predicciones. Verifica que el backend está activo."
        );
      })
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  const activeSeries =
    activeMetric === "tokens" ? predictions?.tokens : predictions?.cost;

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Stats rápidos de la predicción
  const realPoints = activeSeries?.points.filter((p) => !p.is_prediction) ?? [];
  const predPoints = activeSeries?.points.filter((p) => p.is_prediction) ?? [];
  const lastReal = realPoints[realPoints.length - 1];
  const day7 = predPoints[6]; // índice 6 = día 7
  const day15 = predPoints[predPoints.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 float-in">
        <div>
          <h1 className="text-2xl font-semibold text-dm-foreground tracking-tight">
            ML Predictions
          </h1>
          <p className="text-sm text-dm-muted-foreground mt-1">
            Proyecciones de uso y coste generadas por modelos de series temporales
            {predictions && (
              <span className="ml-2 text-xs text-dm-muted-foreground/70">
                · Modelo: {predictions.model_used} · Confianza:{" "}
                {(predictions.confidence_level * 100).toFixed(0)}%
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Metric toggle */}
          <div className="flex items-center glass rounded-2xl p-1" role="tablist">
            <button
              role="tab"
              aria-selected={activeMetric === "tokens"}
              onClick={() => setActiveMetric("tokens")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-medium transition-colors duration-300",
                activeMetric === "tokens"
                  ? "bg-dm-primary text-white glow-active"
                  : "text-dm-muted-foreground hover:text-dm-foreground"
              )}
            >
              Tokens
            </button>
            <button
              role="tab"
              aria-selected={activeMetric === "cost"}
              onClick={() => setActiveMetric("cost")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-medium transition-colors duration-300",
                activeMetric === "cost"
                  ? "bg-dm-primary text-white glow-active"
                  : "text-dm-muted-foreground hover:text-dm-foreground"
              )}
            >
              Coste (EUR)
            </button>
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="glass rounded-2xl p-4 border border-dm-destructive/30 text-dm-destructive text-sm float-in">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !predictions ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="glass rounded-3xl p-5 h-32 animate-pulse"
              />
            ))}
          </div>
          <div className="glass rounded-3xl p-5 h-96 animate-pulse" />
        </div>
      ) : predictions && activeSeries ? (
        <>
          {/* Summary cards */}
          <section
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            aria-label="Resumen de predicciones"
          >
            {/* Último valor real */}
            <GlassCard className="p-5 float-in" style={{ animationDelay: "40ms" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-dm-secondary flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-dm-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-dm-muted-foreground">Último día real</p>
                  <p className="text-xs text-dm-muted-foreground/70">
                    {lastReal?.date ?? "—"}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-dm-foreground tabular-nums">
                {lastReal
                  ? activeMetric === "tokens"
                    ? `${lastReal.value.toLocaleString("es-ES")} tokens`
                    : `€${lastReal.value.toFixed(2)}`
                  : "—"}
              </p>
            </GlassCard>

            {/* Predicción a 7 días */}
            <GlassCard className="p-5 float-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-dm-muted-foreground">
                    Predicción 7 días
                  </p>
                  <p className="text-xs text-dm-muted-foreground/70">
                    {day7?.date ?? "—"}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-dm-foreground tabular-nums">
                {day7
                  ? activeMetric === "tokens"
                    ? `${day7.value.toLocaleString("es-ES")} tokens`
                    : `€${day7.value.toFixed(2)}`
                  : "—"}
              </p>
              {day7 && (
                <div className="flex gap-3 mt-2 text-[10px]">
                  <span className="text-green-400 font-bold drop-shadow-md">
                    ↑ Opt:{" "}
                    {activeMetric === "tokens"
                      ? day7.upper_bound.toLocaleString("es-ES")
                      : `€${day7.upper_bound.toFixed(2)}`}
                  </span>
                  <span className="text-red-400 font-bold drop-shadow-md">
                    ↓ Pes:{" "}
                    {activeMetric === "tokens"
                      ? day7.lower_bound.toLocaleString("es-ES")
                      : `€${day7.lower_bound.toFixed(2)}`}
                  </span>
                </div>
              )}
            </GlassCard>

            {/* Predicción a 15 días */}
            <GlassCard className="p-5 float-in" style={{ animationDelay: "160ms" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-dm-muted-foreground">
                    Predicción 15 días
                  </p>
                  <p className="text-xs text-dm-muted-foreground/70">
                    {day15?.date ?? "—"}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-dm-foreground tabular-nums">
                {day15
                  ? activeMetric === "tokens"
                    ? `${day15.value.toLocaleString("es-ES")} tokens`
                    : `€${day15.value.toFixed(2)}`
                  : "—"}
              </p>
              {day15 && (
                <div className="flex gap-3 mt-2 text-[10px]">
                  <span className="text-green-400 font-bold drop-shadow-md">
                    ↑ Opt:{" "}
                    {activeMetric === "tokens"
                      ? day15.upper_bound.toLocaleString("es-ES")
                      : `€${day15.upper_bound.toFixed(2)}`}
                  </span>
                  <span className="text-red-400 font-bold drop-shadow-md">
                    ↓ Pes:{" "}
                    {activeMetric === "tokens"
                      ? day15.lower_bound.toLocaleString("es-ES")
                      : `€${day15.lower_bound.toFixed(2)}`}
                  </span>
                </div>
              )}
            </GlassCard>
          </section>

          {/* Main chart */}
          <WidgetPanel
            title={
              activeMetric === "tokens"
                ? "Predicción de Tokens"
                : "Predicción de Coste"
            }
            subtitle={`Últimos 2 días reales + 15 días de proyección · Global`}
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                />
              </svg>
            }
            style={{ animationDelay: "220ms" }}
          >
            <PredictionChart
              data={activeSeries.points}
              unit={activeSeries.unit}
              metric={activeSeries.metric}
            />
          </WidgetPanel>

          {/* Legend card */}
          <GlassCard
            className="p-5 float-in"
            style={{ animationDelay: "280ms" }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-dm-primary/15 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-dm-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-dm-foreground mb-1">
                  Cómo leer este gráfico
                </h3>
                <p className="text-xs text-dm-muted-foreground leading-relaxed">
                  La <span className="text-dm-primary font-medium">línea central</span> muestra 
                  la predicción esperada basada en el modelo de series temporales (Prophet). La{" "}
                  <span className="text-green-400 font-medium">banda verde</span> representa el 
                  escenario optimista y la{" "}
                  <span className="text-red-400 font-medium">banda roja</span> el escenario pesimista, 
                  calculados con un intervalo de confianza del{" "}
                  {(predictions.confidence_level * 100).toFixed(0)}%. La línea 
                  discontinua vertical separa los datos reales de las predicciones.
                </p>
              </div>
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
};

export default Predictions;
