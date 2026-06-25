/* ─── KPI Types ─── */

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

export interface GitCorrelation {
  prompts_before_commit: number;
  avg_per_commit: number;
  correlated_commits: number;
  total_commits: number;
}

export interface TopUser {
  username: string;
  tokens: number;
  cost_eur: number;
}

export interface KPIResponse {
  total_tokens: number;
  total_cost_eur: number;
  total_sessions: number;
  most_frequent_prompt_type: string;
  correlated_commits_count: number;
  total_commits: number;
  correlated_commits_ratio: number;
  correlation_ratio: number;
  git_correlation: GitCorrelation;
  daily_usage: DailyUsage[];
  prompt_type_distribution: PromptTypeDistribution[];
  correlation_data: CorrelationPoint[];
  period_from: string;
  period_to: string;
  top_users: TopUser[];
}

/* ─── Insights ─── */

export interface InsightResponse {
  id: number;
  content: string;
  period_start: string;
  period_end: string;
  model_used: string;
  tokens_used: number | null;
  created_at: string;
}

/* ─── Events ─── */

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

export interface AIEventResponse {
  id: number;
  user_id: number;
  model_id: string;
  prompt_type: string;
  prompt_text: string | null;
  response_text: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_eur: number;
  session_id: string | null;
  repo: string | null;
  timestamp: string;
  created_at: string;
}

export interface GitEventCreate {
  user_id: number;
  commit_sha: string;
  commit_message?: string;
  repo: string;
  branch?: string;
  files_changed?: number;
  insertions?: number;
  deletions?: number;
  timestamp: string;
}

/* ─── Users ─── */

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  team: string | null;
  anonymize: boolean;
  cost_alert_eur_day: number | null;
  retention_days: number;
}

export interface UserPolicyUpdate {
  anonymize?: boolean;
  cost_alert_eur_day?: number | null;
  retention_days?: number;
}
