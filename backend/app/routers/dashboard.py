"""Router para el dashboard de KPIs. Delega toda la lógica en services/metrics.py."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_api_key
from app.schemas.kpi import KPIResponse
from app.schemas.prediction import PredictionResponse
from app.services.metrics import calculate_kpis
from app.services.ml_predictions import generate_predictions

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(verify_api_key)])


@router.get("/kpis", response_model=KPIResponse)
async def get_dashboard_kpis(
    user_id: int | None = Query(default=None, description="ID del usuario (None = todos)"),
    days: int = Query(default=14, ge=1, le=90, description="Número de días a analizar"),
    db: AsyncSession = Depends(get_db),
) -> KPIResponse:
    return await calculate_kpis(db, user_id=user_id, days=days)


@router.get(
    "/predictions",
    response_model=PredictionResponse,
    summary="Predicciones ML de tokens y coste",
)
async def get_predictions(
    user_id: int | None = Query(default=None, description="ID del usuario (None = global)"),
    days_history: int = Query(default=30, ge=7, le=90, description="Días de historia para entrenar"),
    db: AsyncSession = Depends(get_db),
) -> PredictionResponse:
    """
    Genera predicciones de tokens y coste usando Regresión Lineal.

    Devuelve los últimos 2 días reales + 15 días de predicción con bandas
    de confianza (optimista/pesimista).
    """
    return await generate_predictions(db, user_id=user_id, days_history=days_history)