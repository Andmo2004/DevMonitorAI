export interface DailyUsage {
  date: string;
  tokens: number;
  cost_eur: number;
  sessions: number;
}

export interface PromptTypeDistribution {
  prompt_type: string;
  count: number;
  percentage: number;
}

export interface CorrelationPoint {
  date: string;
  ai_tokens: number;
  git_commits: number;
}

export interface KPIResponse {
  total_tokens: number;
  total_cost_eur: number;
  total_sessions: number;
  most_frequent_prompt_type: string;
  correlation_ratio: number;
  daily_usage: DailyUsage[];
  prompt_type_distribution: PromptTypeDistribution[];
  correlation_data: CorrelationPoint[];
}

export interface InsightResponse {
  id: number;
  content: string;
  period_start: string;
  period_end: string;
  model_used: string;
  created_at: string;
}

export interface AIEventCreate {
  user_id: number;
  model_id: string;
  prompt_type: string;
  tokens_in: number;
  tokens_out: number;
  prompt_text?: string;
  repo?: string;
  session_id?: string;
}
