"""
Servicio de cálculo de métricas y KPIs.
Única fuente de verdad para los KPIs del dashboard: tokens, costes, sesiones,
distribución por tipo de prompt, tendencia diaria, top usuarios y correlación
IA ↔ Git en ventana de ±30 minutos.
"""
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import AIEvent, GitEvent, User
from app.schemas.kpi import (
    KPIResponse,
    DailyUsage,
    PromptTypeDistribution,
    CorrelationPoint,
    GitCorrelation
)

CORRELATION_WINDOW_MINUTES = 30


def calculate_ai_git_correlation(
    ai_events: Sequence[AIEvent],
    git_events: Sequence[GitEvent],
    window_minutes: int = CORRELATION_WINDOW_MINUTES,
)-> tuple[int, int, int, float]:
    """
    Calcula la correlación IA↔Git en una ventana de tiempo configurable.

    Returns:
        Tuple de (commits_correlacionados, total_commits, prompts_before_commit,
        avg_per_commit). 'prompts_before_commit' es la suma de eventos IA del
        MISMO usuario que caen en la ventana de cada commit (un evento IA puede
        contar para varios commits si están muy seguidos en el tiempo).
    """
    if not git_events or not ai_events:
        return 0, len(git_events), 0, 0.0

    window = timedelta(minutes=window_minutes)
    correlated = 0
    total_prompts_before_commit = 0
    for git_event in git_events:
        window_start = git_event.timestamp - window
        # Importante: filtrar por user_id — si no, en la vista global se
        # correlacionan eventos IA de un desarrollador con commits de otro.
        matching = [
            e for e in ai_events
            if e.user_id == git_event.user_id
            and window_start <= e.timestamp <= git_event.timestamp
        ]
        if matching:
             correlated += 1
        total_prompts_before_commit += len(matching)

    total_commits = len(git_events)
    avg_per_commit = round(total_prompts_before_commit / total_commits, 2) if total_commits else 0.0
    return correlated, total_commits, total_prompts_before_commit, avg_per_commit


async def _top_users(db: AsyncSession, since: datetime, limit: int = 5) -> list[dict]:
    """Top usuarios por tokens consumidos en el período (solo vista global)."""
    rows = (
        await db.execute(
            select(
                User.username,
                func.coalesce(func.sum(AIEvent.tokens_in + AIEvent.tokens_out), 0).label("tokens"),
                func.coalesce(func.sum(AIEvent.cost_eur), 0.0).label("cost_eur"),
            )
            .join(AIEvent, AIEvent.user_id == User.id)
            .where(AIEvent.timestamp >= since)
            .group_by(User.username)
            .order_by(func.sum(AIEvent.tokens_in + AIEvent.tokens_out).desc())
            .limit(limit)
        )
    ).all()
    return [
        {"username": r.username, "tokens": int(r.tokens), "cost_eur": round(float(r.cost_eur), 4)}
        for r in rows
    ]


async def calculate_kpis(
    db: AsyncSession,
    user_id: int | None = None,
    days: int = 14,
) -> KPIResponse:
    since = datetime.now(tz=timezone.utc) - timedelta(days=days)
    now = datetime.now(tz=timezone.utc)

    ai_query = select(AIEvent).where(AIEvent.timestamp >= since)
    if user_id is not None:
        ai_query = ai_query.where(AIEvent.user_id == user_id)
    ai_events = (await db.execute(ai_query.order_by(AIEvent.timestamp))).scalars().all()

    git_query = select(GitEvent).where(GitEvent.timestamp >= since)
    if user_id is not None:
        git_query = git_query.where(GitEvent.user_id == user_id)
    git_events = (await db.execute(git_query.order_by(GitEvent.timestamp))).scalars().all()

    total_tokens = sum(e.tokens_in + e.tokens_out for e in ai_events)
    total_cost_eur = sum(e.cost_eur for e in ai_events)
    sessions = len({e.session_id for e in ai_events if e.session_id}) or len(ai_events)

    prompt_counts: dict[str, int] = defaultdict(int)
    for event in ai_events:
        prompt_counts[event.prompt_type] += 1

    total_events = len(ai_events) or 1
    most_frequent = max(prompt_counts, key=prompt_counts.get) if prompt_counts else "N/A"

    prompt_distribution = [
        PromptTypeDistribution(
            prompt_type=pt, count=count, percentage=round(count / total_events * 100, 1)
        )
        for pt, count in sorted(prompt_counts.items(), key=lambda x: -x[1])
    ]

    daily_data: dict[str, dict] = defaultdict(lambda: {"tokens": 0, "cost_eur": 0.0, "sessions": set()})
    for event in ai_events:
        day_key = event.timestamp.strftime("%Y-%m-%d")
        daily_data[day_key]["tokens"] += event.tokens_in + event.tokens_out
        daily_data[day_key]["cost_eur"] += event.cost_eur
        if event.session_id:
            daily_data[day_key]["sessions"].add(event.session_id)

    daily_usage = [
        DailyUsage(
            date=day, tokens=d["tokens"], cost_eur=round(d["cost_eur"], 4), sessions=len(d["sessions"]) or 1
        )
        for day, d in sorted(daily_data.items())
    ]

    git_by_day: dict[str, int] = defaultdict(int)
    for g in git_events:
        git_by_day[g.timestamp.strftime("%Y-%m-%d")] += 1

    all_days = sorted(set(daily_data) | set(git_by_day))
    correlation_data = [
        CorrelationPoint(
            date=day,
            ai_tokens=daily_data.get(day, {}).get("tokens", 0),
            git_commits=git_by_day.get(day, 0),
        )
        for day in all_days
    ]

    ai_days, git_days = set(daily_data), set(git_by_day)
    both_days = ai_days & git_days
    correlation_ratio = round(len(both_days) / len(ai_days) * 100, 1) if ai_days else 0.0

    correlated, total_commits, prompts_before_commit, avg_per_commit = (
        calculate_ai_git_correlation(ai_events, git_events))
    
    correlated_commits_ratio = round(correlated / total_commits * 100, 1) if total_commits else 0.0

    top_users = await _top_users(db, since) if user_id is None else []

    return KPIResponse(
        total_tokens=total_tokens,
        total_cost_eur=round(total_cost_eur, 4),
        total_sessions=sessions,
        most_frequent_prompt_type=most_frequent,
        correlated_commits_count=correlated,
        total_commits=total_commits,
        correlated_commits_ratio=correlated_commits_ratio,
        correlation_ratio=correlation_ratio,
        git_correlation=GitCorrelation(
            prompts_before_commit=prompts_before_commit,
            avg_per_commit=avg_per_commit,
            correlated_commits=correlated,
            total_commits=total_commits,
        ),
        daily_usage=daily_usage,
        prompt_type_distribution=prompt_distribution,
        correlation_data=correlation_data,
        period_from=since.date().isoformat(),
        period_to=now.date().isoformat(),
        top_users=top_users,
    )