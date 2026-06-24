from sqlalchemy import text

async def get_ai_git_correlation(db, since):
    query = text("""
        SELECT
            ge.id,
            ge.user_id,
            COALESCE(ai.count, 0) AS ai_prompts_30min
        FROM git_events ge
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS count
            FROM ai_events ae
            WHERE ae.user_id = ge.user_id
                AND ae.timestamp BETWEEN ge.timestamp - INTERVAL '30 minutes'
                                    AND ge.timestamp
        ) ai ON true
        WHERE ge.timestamp >= :since
    """)

    result = await db.execute(query, {"since": since})
    return result.fetchall()

async def compute_ai_git_kpi(db, since):
    rows = await get_ai_git_correlation(db, since)

    total_commits = len(rows)
    total_ai_prompts = sum(r.ai_prompts_30min for r in rows)
    commits_with_ai = len([r for r in rows if r.ai_prompts_30min > 0])

    return {
        "avg_prompts_per_commit": total_ai_prompts / max(total_commits, 1),
        "commit_ai_ratio": commits_with_ai / max(total_commits, 1),
        "total_commits": total_commits,
        "total_ai_prompts": total_ai_prompts
    }