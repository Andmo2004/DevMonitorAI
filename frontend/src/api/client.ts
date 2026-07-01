import axios from "axios";
import type { AxiosInstance } from "axios";
import type {
  KPIResponse,
  InsightResponse,
  PaginatedInsightResponse,
  AIEventCreate,
  AIEventResponse,
  GitEventCreate,
  UserResponse,
  PaginatedUserResponse,
  UserPolicyUpdate,
  PredictionResponse,
  ChatResponse,
} from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
  timeout: 30_000,
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
  userId?: number,
  days: number = 14
): Promise<KPIResponse> => {
  const params: Record<string, unknown> = { days };
  if (userId !== undefined) params.user_id = userId;
  const { data } = await api.get<KPIResponse>("/dashboard/kpis", { params });
  return data;
};

// --- Predictions ---
export const getPredictions = async (
  userId?: number,
  daysHistory: number = 60
): Promise<PredictionResponse> => {
  const params: Record<string, unknown> = { days_history: daysHistory };
  if (userId !== undefined) params.user_id = userId;
  const { data } = await api.get<PredictionResponse>("/dashboard/predictions", {
    params,
  });
  return data;
};

// --- Insights ---
export const generateInsight = async (
  period: "week" | "month" = "week",
  userId?: number
): Promise<InsightResponse> => {
  const { data } = await api.post<InsightResponse>("/insights/generate", {
    period,
    user_id: userId ?? null,
  });
  return data;
};

export const getLatestInsight = async (
  userId?: number
): Promise<InsightResponse | null> => {
  try {
    const params: Record<string, unknown> = {};
    if (userId !== undefined) params.user_id = userId;
    const { data } = await api.get<InsightResponse>("/insights/latest", {
      params,
    });
    return data;
  } catch {
    return null;
  }
};

export const getInsights = async (
  limit: number = 10,
  offset: number = 0,
  userId?: number
): Promise<PaginatedInsightResponse> => {
  const params: Record<string, unknown> = { limit, offset };
  if (userId !== undefined) params.user_id = userId;
  const { data } = await api.get<PaginatedInsightResponse>("/insights/", {
    params,
  });
  return data;
};

// --- Chat con IA ---
export const chatWithInsights = async (
  question: string,
  summaryJson?: Record<string, unknown> | null
): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>("/insights/chat", {
    question,
    summary_json: summaryJson ?? null,
  });
  return data;
};

// --- Eventos IA ---
export const postAIEvent = async (event: AIEventCreate): Promise<void> => {
  await api.post("/events/ai", event);
};

export const getRecentEvents = async (
  limit: number = 20,
  userId?: number
): Promise<AIEventResponse[]> => {
  const params: Record<string, unknown> = { limit };
  if (userId !== undefined) params.user_id = userId;
  const { data } = await api.get<AIEventResponse[]>("/events/ai/recent", {
    params,
  });
  return data;
};

// --- Eventos Git ---
export const postGitEvent = async (event: GitEventCreate): Promise<void> => {
  await api.post("/events/git", event);
};

// --- Users ---
export const getUsers = async (
  search: string = "",
  limit: number = 10,
  offset: number = 0
): Promise<PaginatedUserResponse> => {
  const { data } = await api.get<PaginatedUserResponse>("/users/", {
    params: { search, limit, offset },
  });
  return data;
};

export const getUser = async (userId: number): Promise<UserResponse> => {
  const { data } = await api.get<UserResponse>(`/users/${userId}`);
  return data;
};

export const updateUserPolicy = async (
  userId: number,
  policy: UserPolicyUpdate
): Promise<UserResponse> => {
  const { data } = await api.post<UserResponse>(
    `/users/${userId}/policy`,
    policy
  );
  return data;
};

export const deleteUser = async (userId: number): Promise<void> => {
  await api.delete(`/users/${userId}`);
};

export default api;
