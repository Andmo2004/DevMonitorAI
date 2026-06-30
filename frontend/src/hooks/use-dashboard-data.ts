import { useState, useEffect, useRef, useCallback } from "react";
import { getKPIs, getLatestInsight } from "../api/client";
import type { KPIResponse, InsightResponse } from "../types/api";

export type TimeRange = "7" | "14" | "30";

interface DashboardData {
  kpis: KPIResponse | null;
  insight: InsightResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboardData(
  range: TimeRange = "14",
  live: boolean = true,
  pollInterval: number = 10_000,
  userId?: number
): DashboardData {
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [kpiData, insightData] = await Promise.all([
        getKPIs(userId, parseInt(range)),
        getLatestInsight(userId),
      ]);
      setKpis(kpiData);
      setInsight(insightData);
      setError(null);
    } catch (err) {
      setError("Error al cargar los datos del dashboard.");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [range, userId]);

  // Initial load + range/userId change
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (live) {
      intervalRef.current = setInterval(fetchData, pollInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [live, pollInterval, fetchData]);

  return {
    kpis,
    insight,
    loading,
    error,
    refresh: fetchData,
  };
}
