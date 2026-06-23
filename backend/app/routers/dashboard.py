"""Router para el dashboard de KPIs."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models import AIEvent, GitEvent
from app.schemas.kpi import (
    KPIResponse,
    DailyUsage,
    PromptTypeDistribution,
    CorrelationPoint,
)

from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(
    user_id: int | None = Query(None, description="Filtrar por usuario (None = todos)"),
    days: int = Query(14, ge=1, le=90, description="Número de días hacia atrás"),
    db: AsyncSession = Depends(get_db),
):
    """Obtener KPIs agregados del dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Filtro base
    ai_filter = AIEvent.timestamp >= since
    git_filter = GitEvent.timestamp >= since
    if user_id is not None:
        ai_filter = (AIEvent.timestamp >= since) & (AIEvent.user_id == user_id)
        git_filter = (GitEvent.timestamp >= since) & (GitEvent.user_id == user_id)

    # Totales
    totals = await db.execute(
        select(
            func.coalesce(func.sum(AIEvent.tokens_in + AIEvent.tokens_out), 0).label("total_tokens"),
            func.coalesce(func.sum(AIEvent.cost_eur), 0.0).label("total_cost_eur"),
            func.count(func.distinct(AIEvent.session_id)).label("total_sessions"),
        ).where(ai_filter)
    )
    row = totals.one()
    total_tokens = int(row.total_tokens)
    total_cost_eur = float(row.total_cost_eur)
    total_sessions = int(row.total_sessions)

    # Tipo de prompt más frecuente
    prompt_dist_q = await db.execute(
        select(
            AIEvent.prompt_type,
            func.count().label("cnt"),
        )
        .where(ai_filter)
        .group_by(AIEvent.prompt_type)
        .order_by(func.count().desc())
    )
    prompt_rows = prompt_dist_q.all()
    total_events = sum(r.cnt for r in prompt_rows) or 1
    most_frequent = prompt_rows[0].prompt_type if prompt_rows else "N/A"

    prompt_type_distribution = [
        PromptTypeDistribution(
            prompt_type=r.prompt_type,
            count=r.cnt,
            percentage=round(r.cnt / total_events * 100, 1),
        )
        for r in prompt_rows
    ]

    # Uso diario
    daily_q = await db.execute(
        select(
            cast(AIEvent.timestamp, Date).label("date"),
            func.coalesce(func.sum(AIEvent.tokens_in + AIEvent.tokens_out), 0).label("tokens"),
            func.coalesce(func.sum(AIEvent.cost_eur), 0.0).label("cost_eur"),
            func.count(func.distinct(AIEvent.session_id)).label("sessions"),
        )
        .where(ai_filter)
        .group_by(cast(AIEvent.timestamp, Date))
        .order_by(cast(AIEvent.timestamp, Date))
    )
    daily_usage = [
        DailyUsage(
            date=str(r.date),
            tokens=int(r.tokens),
            cost_eur=float(r.cost_eur),
            sessions=int(r.sessions),
        )
        for r in daily_q.all()
    ]

    # Correlación IA ↔ Git por día
    ai_daily = await db.execute(
        select(
            cast(AIEvent.timestamp, Date).label("date"),
            func.coalesce(func.sum(AIEvent.tokens_in + AIEvent.tokens_out), 0).label("ai_tokens"),
        )
        .where(ai_filter)
        .group_by(cast(AIEvent.timestamp, Date))
    )
    ai_map = {str(r.date): int(r.ai_tokens) for r in ai_daily.all()}

    git_daily = await db.execute(
        select(
            cast(GitEvent.timestamp, Date).label("date"),
            func.count().label("git_commits"),
        )
        .where(git_filter)
        .group_by(cast(GitEvent.timestamp, Date))
    )
    git_map = {str(r.date): int(r.git_commits) for r in git_daily.all()}

    all_dates = sorted(set(ai_map.keys()) | set(git_map.keys()))
    correlation_data = [
        CorrelationPoint(
            date=d,
            ai_tokens=ai_map.get(d, 0),
            git_commits=git_map.get(d, 0),
        )
        for d in all_dates
    ]

    # Ratio de correlación simple (promedio commits / promedio sesiones IA)
    avg_commits = sum(git_map.values()) / max(len(git_map), 1)
    avg_tokens = sum(ai_map.values()) / max(len(ai_map), 1)
    correlation_ratio = round(avg_commits / max(avg_tokens / 1000, 0.01), 2)

    return KPIResponse(
        total_tokens=total_tokens,
        total_cost_eur=round(total_cost_eur, 4),
        total_sessions=total_sessions,
        most_frequent_prompt_type=most_frequent,
        correlation_ratio=correlation_ratio,
        daily_usage=daily_usage,
        prompt_type_distribution=prompt_type_distribution,
        correlation_data=correlation_data,
    )
