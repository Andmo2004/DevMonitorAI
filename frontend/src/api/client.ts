import axios from "axios";
import type { AxiosInstance } from "axios";
import type { KPIResponse, InsightResponse, AIEventCreate, GitEventCreate } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
    "X-devmonitor-Key": API_KEY,
  },
  timeout: 10_000,
});

// Interceptor global para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data ?? error.message);
    return Promise.reject(error);
  }
);

// --- KPIs ---
export const getKPIs = async (
  userId: number,
  days: number = 14
): Promise<KPIResponse> => {
  const { data } = await api.get<KPIResponse>("/dashboard/kpis", {
    params: { user_id: userId, days },
  });
  return data;
};

// --- Insights ---
export const generateInsight = async (
  period: "week" | "month" = "week"
): Promise<InsightResponse> => {
  const { data } = await api.post<InsightResponse>("/insights/generate", {
    period,
  });
  return data;
};

export const getLatestInsight = async (): Promise<InsightResponse | null> => {
  try {
    const { data } = await api.get<InsightResponse>("/insights/latest");
    return data;
  } catch {
    return null;
  }
};

// --- Eventos IA (para el agente) ---
export const postAIEvent = async (event: AIEventCreate): Promise<void> => {
  await api.post("/events/ai", event);
};

// --- Eventos Git ---
export const postGitEvent = async (event: GitEventCreate): Promise<void> => {
  await api.post("/events/git", event);
};

export default api;
