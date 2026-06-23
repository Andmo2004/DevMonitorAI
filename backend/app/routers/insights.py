"""Router para insights generados por IA."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.core.database import get_db
from app.models import Insight
from app.schemas.insight import InsightResponse

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("/generate", response_model=InsightResponse, status_code=201)
async def generate_insight(
    db: AsyncSession = Depends(get_db),
):
    """
    Generar un nuevo insight de gobernanza con IA.
    TODO (Fase 2): Integrar con Anthropic Claude API.
    """
    raise HTTPException(
        status_code=501,
        detail="Generación de insights con IA no implementada aún (Fase 2).",
    )


@router.get("/latest", response_model=InsightResponse | None)
async def get_latest_insight(db: AsyncSession = Depends(get_db)):
    """Obtener el insight más reciente."""
    result = await db.execute(
        select(Insight).order_by(desc(Insight.created_at)).limit(1)
    )
    insight = result.scalar_one_or_none()
    if insight is None:
        raise HTTPException(status_code=404, detail="No hay insights disponibles.")
    return insight
