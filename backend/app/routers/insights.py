from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import Insight, User
from app.schemas.insight import InsightGenerateRequest, InsightResponse
from app.services.insight_engine import generate_weekly_insight
from app.services.metrics import calculate_kpis

router = APIRouter(prefix="/insights", tags=["insights"])


async def build_summary_from_kpis(db: AsyncSession, user_id: int | None, days: int) -> dict:
    """
    Construye el summary_dict combinando datos de todos los usuarios o de uno específico.
    """
    since = datetime.now(tz=timezone.utc) - timedelta(days=days)

    if user_id:
        kpis = await calculate_kpis(db, user_id=user_id, days=days)
        num_users = 1
    else:
        # Insight global: agregar todos los usuarios
        users_result = await db.execute(select(User))
        users = users_result.scalars().all()
        num_users = len(users)

        # KPIs del primer usuario como base (simplificación para el hackathon)
        if not users:
            raise HTTPException(status_code=404, detail="No hay usuarios en el sistema")

        kpis = await calculate_kpis(db, user_id=users[0].id, days=days)

    period_end_dt = datetime.now(tz=timezone.utc)
    period_start_dt = period_end_dt - timedelta(days=days)

    return {
        "period": f"semana del {period_start_dt.strftime('%d')} al {period_end_dt.strftime('%d de %B de %Y')}",
        "total_tokens": kpis.total_tokens,
        "total_cost_eur": kpis.total_cost_eur,
        "total_sessions": kpis.total_sessions,
        "num_users": num_users,
        "prompt_type_distribution": [
            {"prompt_type": p.prompt_type, "count": p.count, "percentage": p.percentage}
            for p in kpis.prompt_type_distribution
        ],
        "total_commits": kpis.total_commits,
        "correlated_commits_count": kpis.correlated_commits_count,
        "correlated_commits_ratio": kpis.correlated_commits_ratio,
    }


@router.post(
    "/generate",
    response_model=InsightResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generar insight semanal con IA",
)
async def generate_insight(
    request: InsightGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera un insight semanal usando Claude API.

    1. Recoge los datos de actividad del período.
    2. Construye el resumen.
    3. Llama a Claude para generar el análisis.
    4. Persiste el insight en la base de datos.
    """
    days = 7 if request.period == "week" else 30

    try:
        summary = await build_summary_from_kpis(db, request.user_id, days)
        content, tokens_used = await generate_weekly_insight(summary)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al generar el insight: {str(e)}",
        )

    now = datetime.now(tz=timezone.utc)
    insight = Insight(
        user_id=request.user_id,
        period_start=now - timedelta(days=days),
        period_end=now,
        content=content,
        model_used="claude-sonnet-4-6",
        tokens_used=tokens_used,
        summary_json = summary
    )
    db.add(insight)
    await db.flush()
    await db.refresh(insight)

    return insight


@router.get(
    "/latest",
    response_model=InsightResponse,
    summary="Obtener el último insight generado",
)
async def get_latest_insight(
    user_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Devuelve el insight más reciente. Si se especifica user_id, filtra por usuario.
    """
    query = select(Insight).order_by(Insight.created_at.desc()).limit(1)

    if user_id is not None:
        query = query.where(Insight.user_id == user_id)

    result = await db.execute(query)
    insight = result.scalar_one_or_none()

    if insight is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay insights generados aún",
        )

    return insight
