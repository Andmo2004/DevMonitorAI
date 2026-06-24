"""Router para eventos de IA y Git."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.ai_event import AIEventCreate, AIEventResponse
from app.schemas.git_event import GitEventCreate, GitEventResponse
from app.services.event_service import create_ai_event, create_git_event
from app.core.pricing import calculate_cost_eur

# para controlar que timestamp si llega None no anule el post
from datetime import datetime, timezone

router = APIRouter(prefix="/events", tags=["events"])


@router.post(
    "/ai",
    response_model=AIEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar evento de uso de IA",
)
async def register_ai_event(
    event_data: AIEventCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Registra un evento de uso de una herramienta IA.

    - Calcula el coste en EUR automáticamente según el modelo.
    - Aplica anonimización si el usuario tiene esa política activada.
    - Persiste el evento en la base de datos.
    """
    try:
        event = await create_ai_event(db, event_data)
        return event
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar el evento: {str(e)}",
        )


@router.post(
    "/git",
    response_model=GitEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar evento Git (commit)",
)
async def register_git_event(
    event_data: GitEventCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Registra un evento Git (commit) capturado por el git hook.

    - Valida la existencia del usuario.
    - Persiste el evento en la base de datos.
    """
    try:
        event = await create_git_event(db, event_data)
        return event
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar el evento git: {str(e)}",
        )
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
