"""
Motor de generación de insights semanales usando Claude API.

La función principal construye un prompt con el resumen de actividad
y llama a Claude para obtener un análisis en lenguaje natural.
"""
import json
from datetime import datetime, timezone

import anthropic

from app.core.config import get_settings

settings = get_settings()

_client = None


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    """Singleton del cliente Anthropic async para reutilizar la conexión."""
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


def build_insight_prompt(summary: dict) -> str:
    """
    Construye el prompt para el análisis semanal.

    El summary_dict debe contener:
    - period: str (ej: "semana del 15 al 21 de junio de 2026")
    - total_tokens: int
    - total_cost_eur: float
    - total_sessions: int
    - num_users: int
    - prompt_type_distribution: list[dict] con {prompt_type, count, percentage}
    - total_commits: int
    - correlated_commits_count: int
    - correlated_commits_ratio: float
    - top_repos: list[str]
    """
    distribution_text = "\n".join([
        f"  - {item['prompt_type']}: {item['count']} usos ({item['percentage']}%)"
        for item in summary.get("prompt_type_distribution", [])
    ])

    prompt = f"""Eres el asistente de gobernanza de IA de Glasstics. Analiza los siguientes datos de uso de IA del equipo de desarrollo y genera un informe conciso con recomendaciones accionables.

**Datos del período: {summary.get('period', 'última semana')}**

Estadísticas generales:
- Tokens consumidos: {summary.get('total_tokens', 0):,}
- Coste estimado: {summary.get('total_cost_eur', 0.0):.4f} EUR
- Sesiones de uso: {summary.get('total_sessions', 0)}
- Usuarios activos: {summary.get('num_users', 0)}

Distribución por tipo de prompt:
{distribution_text}

Correlación con productividad Git:
- Commits totales: {summary.get('total_commits', 0)}
- Commits precedidos por uso de IA: {summary.get('correlated_commits_count', 0)} ({summary.get('correlated_commits_ratio', 0.0):.1f}%)

Genera un informe con EXACTAMENTE esta estructura:

**Resumen ejecutivo** (2-3 frases sobre el uso general del período)

**Patrones detectados** (2-3 patrones observados en los datos)

**Correlación IA → Productividad** (análisis de la relación entre uso de IA y commits)

**Recomendaciones** (2-3 recomendaciones concretas y accionables para el equipo)

El informe debe ser en español, profesional pero accesible, y orientado a un manager técnico o CTO."""

    return prompt


async def generate_weekly_insight(summary_dict: dict) -> tuple[str, int]:
    """
    Llama a Claude API para generar el insight semanal.

    Args:
        summary_dict: Diccionario con el resumen de actividad del período.

    Returns:
        Tuple de (contenido_del_insight: str, tokens_usados: int)
    """
    client = get_anthropic_client()
    prompt = build_insight_prompt(summary_dict)

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": prompt}
        ],
    )

    content = message.content[0].text  # type: ignore[attr-defined]
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    return content, tokens_used


async def chat_with_analyst(
    question: str,
    summary_dict: dict | None = None,
) -> tuple[str, int, str]:
    """
    Chat interactivo con Claude actuando como analista de datos del dashboard.

    Args:
        question: Pregunta del usuario.
        summary_dict: Contexto de datos del dashboard (opcional).

    Returns:
        Tuple de (respuesta: str, tokens_usados: int, modelo: str)
    """
    client = get_anthropic_client()
    model = "claude-sonnet-4-6"

    context_block = ""
    if summary_dict:
        context_block = f"""
Datos actuales del dashboard:
- Tokens consumidos: {summary_dict.get('total_tokens', 'N/A')}
- Coste estimado: {summary_dict.get('total_cost_eur', 'N/A')} EUR
- Sesiones: {summary_dict.get('total_sessions', 'N/A')}
- Usuarios activos: {summary_dict.get('num_users', 'N/A')}
- Commits totales: {summary_dict.get('total_commits', 'N/A')}
- Commits correlacionados con IA: {summary_dict.get('correlated_commits_count', 'N/A')} ({summary_dict.get('correlated_commits_ratio', 'N/A')}%)
- Período: {summary_dict.get('period', 'N/A')}
"""

    system_prompt = f"""Eres un analista de datos senior especializado en el dashboard de Glasstics, una plataforma de gobernanza y monitorización del uso de inteligencia artificial en equipos de desarrollo de software.

Tu rol es responder preguntas sobre los datos del dashboard de forma clara, concisa y accionable. Basa tus respuestas en los datos proporcionados cuando estén disponibles.

Directrices:
- Responde siempre en español.
- Sé conciso pero informativo (máximo 3-4 párrafos).
- Si los datos son insuficientes para responder, indícalo claramente.
- Ofrece recomendaciones concretas cuando sea apropiado.
- Usa un tono profesional pero accesible.
{context_block}"""

    message = await client.messages.create(
        model=model,
        max_tokens=800,
        system=system_prompt,
        messages=[
            {"role": "user", "content": question}
        ],
    )

    answer = message.content[0].text  # type: ignore[attr-defined]
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    return answer, tokens_used, model

