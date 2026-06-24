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


def get_anthropic_client() -> anthropic.Anthropic:
    """Singleton del cliente Anthropic para reutilizar la conexión."""
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
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

    prompt = f"""Eres el asistente de gobernanza de IA de devmonitor·AI. Analiza los siguientes datos de uso de IA del equipo de desarrollo y genera un informe conciso con recomendaciones accionables.

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

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": prompt}
        ],
    )

    content = message.content[0].text  # type: ignore[attr-defined]
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    return content, tokens_used
