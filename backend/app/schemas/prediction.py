"""Schemas Pydantic para el módulo de predicciones ML."""
from pydantic import BaseModel, Field


class PredictionPoint(BaseModel):
    """Un punto individual de la serie temporal (real o predicho)."""

    date: str = Field(..., description="Fecha en formato YYYY-MM-DD")
    value: float = Field(..., description="Valor esperado (predicción central)")
    upper_bound: float = Field(..., description="Límite superior (optimista)")
    lower_bound: float = Field(..., description="Límite inferior (pesimista)")
    is_prediction: bool = Field(..., description="True si es dato predicho, False si es real")


class PredictionSeries(BaseModel):
    """Serie temporal completa para una métrica."""

    metric: str = Field(..., description="Nombre de la métrica (tokens o cost_eur)")
    unit: str = Field(..., description="Unidad de medida")
    points: list[PredictionPoint]


class PredictionResponse(BaseModel):
    """Respuesta completa del endpoint de predicciones."""

    tokens: PredictionSeries
    cost: PredictionSeries
    model_used: str = Field(default="LinearRegression", description="Modelo ML utilizado")
    confidence_level: float = Field(default=0.9, description="Nivel de confianza de las bandas")
