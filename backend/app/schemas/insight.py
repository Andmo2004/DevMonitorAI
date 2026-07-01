from datetime import datetime
from pydantic import BaseModel


class InsightGenerateRequest(BaseModel):
    period: str = "week"
    user_id: int | None = None  # None = insight global del equipo


class InsightResponse(BaseModel):
    id: int
    content: str
    period_start: datetime
    period_end: datetime
    model_used: str
    tokens_used: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedInsightResponse(BaseModel):
    items: list[InsightResponse]
    total_count: int
