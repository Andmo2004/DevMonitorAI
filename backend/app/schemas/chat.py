"""Schemas Pydantic para el chat integrado con IA."""
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Petición de chat con el analista IA."""

    question: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Pregunta del usuario sobre los datos del dashboard",
    )
    summary_json: dict | None = Field(
        default=None,
        description="Contexto de datos actual del dashboard (opcional, se genera uno fresco si no se envía)",
    )


class ChatResponse(BaseModel):
    """Respuesta del analista IA."""

    answer: str = Field(..., description="Respuesta del analista de datos")
    tokens_used: int = Field(..., description="Tokens consumidos en la llamada")
    model_used: str = Field(..., description="Modelo de IA utilizado")
