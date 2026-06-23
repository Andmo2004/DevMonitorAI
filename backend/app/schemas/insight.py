"""Schemas Pydantic para insights generados por IA."""
from datetime import datetime
from pydantic import BaseModel


class InsightCreate(BaseModel):
    period: str = "week"  # "week" | "month"


class InsightResponse(BaseModel):
    id: int
    content: str
    period_start: datetime
    period_end: datetime
    model_used: str
    created_at: datetime

    model_config = {"from_attributes": True}
