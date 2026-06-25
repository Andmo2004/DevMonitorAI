import { useState } from "react";
import { useDashboardData, type TimeRange } from "../hooks/use-dashboard-data";
import { KpiCard } from "../components/kpi-card";
import { WidgetPanel } from "../components/widget-panel";
import { CorrelationChart } from "../components/charts/correlation-chart";
import { TrendChart } from "../components/charts/trend-chart";
import { CostBarChart } from "../components/charts/cost-bar-chart";
import { PromptTypeDonut } from "../components/charts/prompt-type-donut";
import { InsightPanel } from "../components/insight-panel";
import { EventFeed } from "../components/event-feed";
import { formatCompact, formatEUR, cn } from "../lib/utils";

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7", label: "7 días" },
  { value: "14", label: "14 días" },
  { value: "30", label: "30 días" },
];

const Dashboard = () => {
  const [range, setRange] = useState<TimeRange>("14");
  const [live, setLive] = useState(true);
  const { kpis, insight, loading, error } = useDashboardData(range, live);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 float-in">
        <div>
          <h1 className="text-2xl font-semibold text-dm-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-dm-muted-foreground mt-1">
            Monitorización del uso de IA en desarrollo
            {kpis && (
              <span className="ml-2 text-xs text-dm-muted-foreground/70">
                · {kpis.period_from} → {kpis.period_to}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex items-center glass rounded-2xl p-1" role="tablist">
            {RANGES.map((r) => (
              <button
                key={r.value}
                role="tab"
                aria-selected={range === r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-300",
                  range === r.value
                    ? "bg-dm-primary text-white glow-active"
                    : "text-dm-muted-foreground hover:text-dm-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setLive(!live)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all glass-hover",
              live
                ? "text-dm-primary"
                : "text-dm-muted-foreground"
            )}
          >
            {live ? (
              <>
                <div className="live-dot" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                <span>Reanudar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="glass rounded-2xl p-4 border border-dm-destructive/30 text-dm-destructive text-sm">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !kpis ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass rounded-3xl p-5 h-36 animate-pulse" />
            ))}
          </div>
          <div className="glass rounded-3xl p-5 h-80 animate-pulse" />
        </div>
      ) : kpis ? (
        <>
          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Indicadores clave">
            <KpiCard
              label="Tokens totales"
              value={formatCompact(kpis.total_tokens)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
              }
              spark={kpis.daily_usage.map((d) => ({ v: d.tokens }))}
              style={{ animationDelay: "40ms" }}
            />
            <KpiCard
              label="Coste estimado"
              value={formatEUR(kpis.total_cost_eur)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accent="var(--chart-2)"
              spark={kpis.daily_usage.map((d) => ({ v: d.cost_eur }))}
              style={{ animationDelay: "100ms" }}
            />
            <KpiCard
              label="Sesiones de trabajo"
              value={String(kpis.total_sessions)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
                </svg>
              }
              accent="var(--chart-3)"
              spark={kpis.daily_usage.map((d) => ({ v: d.sessions }))}
              style={{ animationDelay: "160ms" }}
            />
            <KpiCard
              label="Correlación IA↔Git"
              value={`${kpis.correlated_commits_ratio}%`}
              delta={kpis.correlation_ratio > 50 ? 12.3 : -5.1}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              }
              accent="var(--chart-5)"
              style={{ animationDelay: "220ms" }}
            />
          </section>

          {/* Charts Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Gráficas">
            {/* Correlation Chart — full width */}
            <WidgetPanel
              title="Correlación IA ↔ Git"
              subtitle="Tokens de IA vs commits en el período"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              }
              className="lg:col-span-2"
              live={live}
              style={{ animationDelay: "280ms" }}
            >
              <CorrelationChart data={kpis.correlation_data} />
            </WidgetPanel>

            {/* Trend Chart */}
            <WidgetPanel
              title="Tendencia de uso"
              subtitle="Tokens diarios en el período"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              }
              live={live}
              style={{ animationDelay: "340ms" }}
            >
              <TrendChart data={kpis.daily_usage} />
            </WidgetPanel>

            {/* Cost Bar Chart */}
            <WidgetPanel
              title="Coste diario"
              subtitle="Gasto en EUR por día"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
              style={{ animationDelay: "400ms" }}
            >
              <CostBarChart data={kpis.daily_usage} />
            </WidgetPanel>

            {/* Prompt Type Distribution */}
            <WidgetPanel
              title="Tipos de prompt"
              subtitle="Distribución de categorías"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                </svg>
              }
              style={{ animationDelay: "460ms" }}
            >
              <PromptTypeDonut data={kpis.prompt_type_distribution} />
            </WidgetPanel>

            {/* Top Users */}
            {kpis.top_users.length > 0 && (
              <WidgetPanel
                title="Top desarrolladores"
                subtitle="Por consumo de tokens"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                }
                style={{ animationDelay: "520ms" }}
              >
                <div className="space-y-3">
                  {kpis.top_users.map((user, i) => (
                    <div
                      key={user.username}
                      className="flex items-center gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-dm-secondary flex items-center justify-center text-[10px] font-semibold text-dm-primary">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dm-foreground font-medium truncate">
                          {user.username}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-dm-muted-foreground">
                          <span className="tabular-nums">
                            {formatCompact(user.tokens)} tokens
                          </span>
                          <span className="tabular-nums">
                            {formatEUR(user.cost_eur)}
                          </span>
                        </div>
                      </div>
                      <div className="w-24 h-2 rounded-full bg-dm-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-dm-primary/60"
                          style={{
                            width: `${Math.min(
                              (user.tokens / (kpis.top_users[0]?.tokens || 1)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </WidgetPanel>
            )}
          </section>

          {/* Insight Panel */}
          <InsightPanel initialInsight={insight} />

          {/* Event Feed */}
          <EventFeed pollInterval={live ? 5000 : 60000} />
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
