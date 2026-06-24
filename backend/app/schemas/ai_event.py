from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


PromptType = Literal[
    "code_generation",
    "refactoring",
    "debugging",
    "explanation",
    "boilerplate",
    "testing",
    "documentation",
    "other",
]


class AIEventCreate(BaseModel):
    user_id: int
    model_id: str = Field(..., examples=["claude-sonnet-4-6"])
    prompt_type: PromptType
    prompt_text: str | None = Field(None, description="Puede ser None si anonymize=True")
    response_text: str | None = None
    tokens_in: int = Field(..., ge=0)
    tokens_out: int = Field(..., ge=0)
    session_id: str | None = None
    repo: str | None = None
    timestamp: datetime | None = None


class AIEventResponse(BaseModel):
    id: int
    user_id: int
    model_id: str
    prompt_type: str
    prompt_text: str | None = None
    response_text: str | None = None
    tokens_in: int
    tokens_out: int
    cost_eur: float
    session_id: str | None = None
    repo: str | None = None
    timestamp: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
