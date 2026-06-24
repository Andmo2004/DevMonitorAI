# scripts/test_insight.py
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.insight_engine import generate_weekly_insight  # type: ignore[import-not-found]

async def main():
    summary = {
        "period": "semana del 15 al 21 de junio de 2026",
        "total_tokens": 45230,
        "total_cost_eur": 0.1876,
        "total_sessions": 87,
        "num_users": 5,
        "prompt_type_distribution": [
            {"prompt_type": "code_generation", "count": 32, "percentage": 35.0},
            {"prompt_type": "boilerplate", "count": 18, "percentage": 20.0},
            {"prompt_type": "debugging", "count": 16, "percentage": 17.5},
            {"prompt_type": "refactoring", "count": 11, "percentage": 12.0},
        ],
        "total_commits": 23,
        "correlated_commits_count": 15,
        "correlated_commits_ratio": 65.2,
    }

    print("Generando insight...")
    content, tokens = await generate_weekly_insight(summary)
    print(f"\nTokens usados: {tokens}")
    print(f"\n--- INSIGHT GENERADO ---\n{content}")

if __name__ == "__main__":
    asyncio.run(main())
