"""
Servicio de eventos: lógica de negocio para eventos IA y Git.

Aplica políticas de anonimización, calcula costes automáticamente
y valida la existencia del usuario antes de persistir.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, AIEvent, GitEvent
from app.schemas.ai_event import AIEventCreate
from app.schemas.git_event import GitEventCreate
from app.core.pricing import calculate_cost_eur


async def create_ai_event(db: AsyncSession, event_data: AIEventCreate) -> AIEvent:
    """
    Crea un evento IA. Aplica anonimización si el usuario lo requiere.
    Calcula el coste automáticamente a partir del modelo y los tokens.

    Args:
        db: Sesión de base de datos asíncrona.
        event_data: Datos validados del evento IA.

    Returns:
        AIEvent persistido en la base de datos.

    Raises:
        ValueError: Si el usuario con el user_id proporcionado no existe.
    """
    # Verificar si el usuario existe
    result = await db.execute(select(User).where(User.id == event_data.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError(f"Usuario con ID {event_data.user_id} no encontrado")

    # Aplicar política de anonimización
    prompt_text = event_data.prompt_text
    response_text = event_data.response_text
    if user.anonymize:
        prompt_text = None
        response_text = None

    # Calcular coste en EUR
    cost_eur = calculate_cost_eur(
        model_id=event_data.model_id,
        tokens_in=event_data.tokens_in,
        tokens_out=event_data.tokens_out,
    )

    ai_event = AIEvent(
        user_id=event_data.user_id,
        model_id=event_data.model_id,
        prompt_type=event_data.prompt_type,
        prompt_text=prompt_text,
        response_text=response_text,
        tokens_in=event_data.tokens_in,
        tokens_out=event_data.tokens_out,
        cost_eur=cost_eur,
        session_id=event_data.session_id,
        repo=event_data.repo,
        timestamp=event_data.timestamp,
    )

    db.add(ai_event)
    await db.flush()
    await db.refresh(ai_event)

    return ai_event


async def create_git_event(db: AsyncSession, event_data: GitEventCreate) -> GitEvent:
    """
    Crea un evento Git (commit). Valida la existencia del usuario.

    Args:
        db: Sesión de base de datos asíncrona.
        event_data: Datos validados del evento Git.

    Returns:
        GitEvent persistido en la base de datos.

    Raises:
        ValueError: Si el usuario con el user_id proporcionado no existe.
    """
    # Verificar si el usuario existe
    result = await db.execute(select(User).where(User.id == event_data.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError(f"Usuario con ID {event_data.user_id} no encontrado")

    git_event = GitEvent(
        user_id=event_data.user_id,
        commit_sha=event_data.commit_sha,
        commit_message=event_data.commit_message,
        repo=event_data.repo,
        branch=event_data.branch,
        files_changed=event_data.files_changed,
        insertions=event_data.insertions,
        deletions=event_data.deletions,
        timestamp=event_data.timestamp,
    )

    db.add(git_event)
    await db.flush()
    await db.refresh(git_event)

    return git_event
