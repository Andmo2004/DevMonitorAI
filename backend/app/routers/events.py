"""Router para eventos de IA y Git."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import AIEvent, GitEvent
from app.schemas.ai_event import AIEventCreate, AIEventResponse
from app.schemas.git_event import GitEventCreate, GitEventResponse
from app.core.pricing import calculate_cost_eur

# para controlar que timestamp si llega None no anule el post
from datetime import datetime, timezone

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/ai", response_model=AIEventResponse, status_code=201)
async def create_ai_event(event: AIEventCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un nuevo evento de uso de IA."""
    cost_eur = calculate_cost_eur(event.model_id, event.tokens_in, event.tokens_out)

    db_event = AIEvent(
        user_id=event.user_id,
        model_id=event.model_id,
        prompt_type=event.prompt_type,
        prompt_text=event.prompt_text,
        response_text=event.response_text,
        tokens_in=event.tokens_in,
        tokens_out=event.tokens_out,
        cost_eur=cost_eur,
        session_id=event.session_id,
        repo=event.repo,
        timestamp=event.timestamp or datetime.now(timezone.utc),
    )
    db.add(db_event)
    await db.flush()
    await db.refresh(db_event)
    return db_event


@router.post("/git", response_model=GitEventResponse, status_code=201)
async def create_git_event(event: GitEventCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un nuevo evento de Git (commit)."""
    db_event = GitEvent(
        user_id=event.user_id,
        commit_sha=event.commit_sha,
        commit_message=event.commit_message,
        repo=event.repo,
        branch=event.branch,
        files_changed=event.files_changed,
        insertions=event.insertions,
        deletions=event.deletions,
        timestamp=event.timestamp,
    )
    db.add(db_event)
    await db.flush()
    await db.refresh(db_event)
    return db_event
