"""
Servicio de cálculo de métricas y KPIs.

Agrega datos de ai_events y git_events para generar los KPIs
del dashboard principal: tokens, costes, sesiones, distribución
por tipo de prompt, tendencia diaria y correlación IA ↔ Git.
"""
from datetime import datetime, timedelta, timezone
from collections.abc import Sequence
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import AIEvent, GitEvent
from app.schemas.kpi import (
    KPIResponse,
    DailyUsage,
    PromptTypeDistribution,
    CorrelationPoint,
)


def calculate_ai_git_correlation(
    ai_events: Sequence[AIEvent],
    git_events: Sequence[GitEvent],
    window_minutes: int = 30,
) -> tuple[int, int]:
    """
    Calcula cuántos commits fueron precedidos por uso de IA
    en una ventana de tiempo configurable.

    Returns:
        Tuple de (commits_correlacionados, total_commits)
    """
    if not git_events or not ai_events:
        return 0, len(git_events)

    window = timedelta(minutes=window_minutes)
    correlated = 0

    for git_event in git_events:
        commit_time = git_event.timestamp
        window_start = commit_time - window

        # Buscar si hay algún evento IA en la ventana [commit-30min, commit]
        has_preceding_ai = any(
            window_start <= ai_event.timestamp <= commit_time
            for ai_event in ai_events
        )

        if has_preceding_ai:
            correlated += 1

    return correlated, len(git_events)


async def calculate_kpis(
    db: AsyncSession,
    user_id: int | None = None,
    days: int = 14,
) -> KPIResponse:
    """
    Calcula los KPIs principales para un usuario en los últimos N días.

    Métricas calculadas:
    - Tokens totales (suma de tokens_in + tokens_out)
    - Coste total en EUR
    - Número de sesiones únicas
    - Tipo de prompt más frecuente
    - Uso diario (para la serie temporal)
    - Distribución por tipo de prompt
    - Datos de correlación con Git

    Args:
        db: Sesión de base de datos asíncrona.
        user_id: ID del usuario (None = todos los usuarios).
        days: Número de días a analizar hacia atrás.

    Returns:
        KPIResponse con todas las métricas agregadas.
    """
    since = datetime.now(tz=timezone.utc) - timedelta(days=days)

    # --- Query de eventos IA ---
    ai_query = select(AIEvent).where(AIEvent.timestamp >= since)
    if user_id is not None:
        ai_query = ai_query.where(AIEvent.user_id == user_id)
    ai_query = ai_query.order_by(AIEvent.timestamp)

    ai_result = await db.execute(ai_query)
    ai_events = ai_result.scalars().all()

    # --- Query de eventos Git ---
    git_query = select(GitEvent).where(GitEvent.timestamp >= since)
    if user_id is not None:
        git_query = git_query.where(GitEvent.user_id == user_id)
    git_query = git_query.order_by(GitEvent.timestamp)

    git_result = await db.execute(git_query)
    git_events = git_result.scalars().all()

    # --- Aggregaciones ---
    total_tokens = sum(e.tokens_in + e.tokens_out for e in ai_events)
    total_cost_eur = sum(e.cost_eur for e in ai_events)
    sessions = len(set(e.session_id for e in ai_events if e.session_id)) or len(ai_events)

    # Distribución por tipo de prompt
    prompt_counts: dict[str, int] = defaultdict(int)
    for event in ai_events:
        prompt_counts[event.prompt_type] += 1

    total_events = len(ai_events) or 1  # Evitar división por cero
    most_frequent = max(prompt_counts, key=lambda k: prompt_counts[k]) if prompt_counts else "N/A"

    prompt_distribution = [
        PromptTypeDistribution(
            prompt_type=pt,
            count=count,
            percentage=round(count / total_events * 100, 1),
        )
        for pt, count in sorted(prompt_counts.items(), key=lambda x: -x[1])
    ]

    # Uso diario (agrupar por día)
    daily_data: dict[str, dict] = defaultdict(
        lambda: {"tokens": 0, "cost_eur": 0.0, "sessions": set()}
    )
    for event in ai_events:
        day_key = event.timestamp.strftime("%Y-%m-%d")
        daily_data[day_key]["tokens"] += event.tokens_in + event.tokens_out
        daily_data[day_key]["cost_eur"] += event.cost_eur
        if event.session_id:
            daily_data[day_key]["sessions"].add(event.session_id)

    daily_usage = [
        DailyUsage(
            date=day,
            tokens=data["tokens"],
            cost_eur=round(data["cost_eur"], 4),
            sessions=len(data["sessions"]) or 1,
        )
        for day, data in sorted(daily_data.items())
    ]

    # Datos de correlación IA ↔ Git
    git_by_day: dict[str, int] = defaultdict(int)
    for git_event in git_events:
        day_key = git_event.timestamp.strftime("%Y-%m-%d")
        git_by_day[day_key] += 1

    # Combinar días de IA y Git para la correlación
    all_days = sorted(set(list(daily_data.keys()) + list(git_by_day.keys())))
    correlation_data = [
        CorrelationPoint(
            date=day,
            ai_tokens=daily_data.get(day, {}).get("tokens", 0),
            git_commits=git_by_day.get(day, 0),
        )
        for day in all_days
    ]

    # Ratio de correlación: porcentaje de días con IA que también tienen commits
    ai_days = set(daily_data.keys())
    git_days = set(git_by_day.keys())
    both_days = ai_days & git_days
    correlation_ratio = (
        round(len(both_days) / len(ai_days) * 100, 1) if ai_days else 0.0
    )

    # Correlación temporal IA ↔ Git
    correlated, total_commits = calculate_ai_git_correlation(ai_events, git_events)
    correlation_ratio_commits = (
        round(correlated / total_commits * 100, 1) if total_commits > 0 else 0.0
    )

    return KPIResponse(
        total_tokens=total_tokens,
        total_cost_eur=round(total_cost_eur, 4),
        total_sessions=sessions,
        most_frequent_prompt_type=most_frequent,
        correlated_commits_count=correlated,
        total_commits=total_commits,
        correlated_commits_ratio=correlation_ratio_commits,
        correlation_ratio=correlation_ratio,
        daily_usage=daily_usage,
        prompt_type_distribution=prompt_distribution,
        correlation_data=correlation_data,
    )
