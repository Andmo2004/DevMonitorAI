from pydantic import BaseModel


class DailyUsage(BaseModel):
    date: str  # formato "YYYY-MM-DD"
    tokens: int
    cost_eur: float
    sessions: int


class PromptTypeDistribution(BaseModel):
    prompt_type: str
    count: int
    percentage: float


class CorrelationPoint(BaseModel):
    date: str
    ai_tokens: int
    git_commits: int


class KPIResponse(BaseModel):
    total_tokens: int
    total_cost_eur: float
    total_sessions: int
    most_frequent_prompt_type: str
    correlated_commits_count: int = 0
    total_commits: int = 0
    correlated_commits_ratio: float = 0.0
    correlation_ratio: float
    daily_usage: list[DailyUsage]
    prompt_type_distribution: list[PromptTypeDistribution]
    correlation_data: list[CorrelationPoint]
