"""
Servicio de cálculo de métricas y KPIs.
Única fuente de verdad para los KPIs del dashboard: tokens, costes, sesiones,
distribución por tipo de prompt, tendencia diaria, top usuarios y correlación
IA ↔ Git en ventana de ±30 minutos.
"""
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from collections.abc import Sequence

from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from dataclasses import dataclass

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
    ai_events: Sequence,
    git_events: Sequence,
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

    import bisect
    from collections import defaultdict
    
    # Agrupar y ordenar eventos IA por usuario
    ai_events_by_user = defaultdict(list)
    for e in ai_events:
        ai_events_by_user[e.user_id].append(e.timestamp)
        
    for user_id in ai_events_by_user:
        ai_events_by_user[user_id].sort()

    window = timedelta(minutes=window_minutes)
    correlated = 0
    total_prompts_before_commit = 0
    
    for git_event in git_events:
        user_ai_times = ai_events_by_user.get(git_event.user_id)
        if not user_ai_times:
            continue
            
        window_start = git_event.timestamp - window
        window_end = git_event.timestamp
        
        idx_start = bisect.bisect_left(user_ai_times, window_start)
        idx_end = bisect.bisect_right(user_ai_times, window_end)
        
        count = idx_end - idx_start
        if count > 0:
             correlated += 1
             total_prompts_before_commit += count

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

    ai_where_clause = [AIEvent.timestamp >= since]
    if user_id is not None:
        ai_where_clause.append(AIEvent.user_id == user_id)

    git_where_clause = [GitEvent.timestamp >= since]
    if user_id is not None:
        git_where_clause.append(GitEvent.user_id == user_id)

    # 1. Totals
    totals_result = await db.execute(
        select(
            func.coalesce(func.sum(AIEvent.tokens_in + AIEvent.tokens_out), 0),
            func.coalesce(func.sum(AIEvent.cost_eur), 0.0),
            func.count(func.distinct(AIEvent.session_id)),
            func.count(AIEvent.id),
        ).where(*ai_where_clause)
    )
    total_tokens, total_cost_eur, sessions, total_events = totals_result.one()
    sessions = sessions or total_events
    total_events = total_events or 1

    # 2. Prompt Distribution
    dist_result = await db.execute(
        select(AIEvent.prompt_type, func.count(AIEvent.id))
        .where(*ai_where_clause)
        .group_by(AIEvent.prompt_type)
        .order_by(func.count(AIEvent.id).desc())
    )
    prompt_counts = dist_result.all()
    most_frequent = prompt_counts[0][0] if prompt_counts else "N/A"

    prompt_distribution = [
        PromptTypeDistribution(
            prompt_type=pt, count=count, percentage=round(count / total_events * 100, 1)
        )
        for pt, count in prompt_counts
    ]

    # 3. Daily AI Usage
    daily_ai_result = await db.execute(
        select(
            cast(AIEvent.timestamp, Date),
            func.coalesce(func.sum(AIEvent.tokens_in + AIEvent.tokens_out), 0),
            func.coalesce(func.sum(AIEvent.cost_eur), 0.0),
            func.count(func.distinct(AIEvent.session_id)),
            func.count(AIEvent.id)
        )
        .where(*ai_where_clause)
        .group_by(cast(AIEvent.timestamp, Date))
    )
    
    daily_data: dict[str, dict] = {}
    for day_date, tokens, cost, sess_count, ev_count in daily_ai_result.all():
        day_str = day_date.isoformat() if hasattr(day_date, 'isoformat') else str(day_date)
        daily_data[day_str] = {
            "tokens": int(tokens),
            "cost_eur": float(cost),
            "sessions": int(sess_count) or int(ev_count) or 1
        }

    daily_usage = [
        DailyUsage(
            date=day, tokens=d["tokens"], cost_eur=round(d["cost_eur"], 4), sessions=d["sessions"]
        )
        for day, d in sorted(daily_data.items())
    ]

    # 4. Daily Git Usage
    daily_git_result = await db.execute(
        select(cast(GitEvent.timestamp, Date), func.count(GitEvent.id))
        .where(*git_where_clause)
        .group_by(cast(GitEvent.timestamp, Date))
    )
    git_by_day: dict[str, int] = {
        (r[0].isoformat() if hasattr(r[0], 'isoformat') else str(r[0])): int(r[1])
        for r in daily_git_result.all()
    }

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

    # 5. Correlation (fetching lightweight tuples instead of full objects to save memory/time)
    @dataclass
    class CorEvent:
        user_id: int
        timestamp: datetime
        
    ai_cor_rows = (await db.execute(select(AIEvent.user_id, AIEvent.timestamp).where(*ai_where_clause))).all()
    git_cor_rows = (await db.execute(select(GitEvent.user_id, GitEvent.timestamp).where(*git_where_clause))).all()
    
    ai_events = [CorEvent(r[0], r[1]) for r in ai_cor_rows]
    git_events = [CorEvent(r[0], r[1]) for r in git_cor_rows]

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