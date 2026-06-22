from datetime import datetime
from pydantic import BaseModel, Field


class GitEventCreate(BaseModel):
    user_id: int
    commit_sha: str = Field(..., min_length=7, max_length=40)
    commit_message: str | None = None
    repo: str
    branch: str | None = None
    files_changed: int | None = None
    insertions: int | None = None
    deletions: int | None = None
    timestamp: datetime


class GitEventResponse(BaseModel):
    id: int
    user_id: int
    commit_sha: str
    commit_message: str | None
    repo: str
    branch: str | None
    files_changed: int | None
    timestamp: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
