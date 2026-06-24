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
