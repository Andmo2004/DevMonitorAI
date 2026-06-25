"""
Script de seed para poblar la base de datos con datos de demo.
Genera 5 usuarios con 14 días de actividad realista.

Uso:
    cd backend
    python ../scripts/seed_demo.py
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone
from faker import Faker

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import AsyncSessionLocal, engine, Base
from app.models import User, AIEvent, GitEvent, Insight
from app.core.pricing import calculate_cost_eur

fake = Faker("es_ES")
random.seed(42)  # Reproducible

# --- Configuración de usuarios demo ---
DEMO_USERS = [
    {"username": "ana.garcia", "email": "ana.garcia@atmira.com", "role": "developer"},
    {"username": "carlos.lopez", "email": "carlos.lopez@atmira.com", "role": "developer"},
    {"username": "sofia.martin", "email": "sofia.martin@atmira.com", "role": "developer"},
    {"username": "pablo.sanchez", "email": "pablo.sanchez@atmira.com", "role": "developer"},
    {"username": "lucia.fernandez", "email": "lucia.fernandez@atmira.com", "role": "admin"},
]

PROMPT_TYPES = [
    ("code_generation", 0.35),
    ("boilerplate", 0.20),
    ("debugging", 0.18),
    ("refactoring", 0.12),
    ("explanation", 0.08),
    ("testing", 0.05),
    ("documentation", 0.02),
]

MODELS = [
    ("claude-sonnet-4-6", 0.70),
    ("claude-haiku-4-5-20251001", 0.25),
    ("claude-opus-4-6", 0.05),
]

REPOS = [
    "devmonitor-ai",
    "api-gateway",
    "frontend-portal",
    "data-pipeline",
    "infra-terraform",
]

BRANCHES = ["main", "develop", "feature/auth", "feature/dashboard", "fix/api-timeout"]


def weighted_choice(choices: list[tuple]) -> str:
    """Elige un elemento con probabilidad ponderada."""
    items, weights = zip(*choices)
    return random.choices(items, weights=weights, k=1)[0]


def generate_ai_events_for_day(
    user_id: int, date: datetime, intensity: float
) -> list[AIEvent]:
    if intensity < 0.1:
        return []

    num_events = int(random.gauss(mu=8 * intensity, sigma=3))
    num_events = max(0, min(num_events, 20))

    events = []
    for _ in range(num_events):
        hour = random.randint(8, 19)
        minute = random.randint(0, 59)
        event_time = date.replace(hour=hour, minute=minute, second=random.randint(0, 59))

        model_id = weighted_choice(MODELS)
        prompt_type = weighted_choice(PROMPT_TYPES)

        tokens_in = int(random.gauss(mu=500, sigma=200))
        tokens_in = max(50, min(tokens_in, 2000))
        tokens_out = int(random.gauss(mu=800, sigma=300))
        tokens_out = max(100, min(tokens_out, 3000))

        cost_eur = calculate_cost_eur(model_id, tokens_in, tokens_out)

        events.append(AIEvent(
            user_id=user_id,
            model_id=model_id,
            prompt_type=prompt_type,
            prompt_text=None,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_eur=cost_eur,
            repo=random.choice(REPOS),
            timestamp=event_time,
        ))

    return events


def generate_git_events_for_day(
    user_id: int, date: datetime, ai_intensity: float
) -> list[GitEvent]:
    if ai_intensity < 0.2 or random.random() > (0.6 + ai_intensity * 0.3):
        return []

    num_commits = random.choices([1, 2, 3], weights=[0.5, 0.3, 0.2])[0]

    commits = []
    for _ in range(num_commits):
        hour = random.randint(10, 20)
        commit_time = date.replace(hour=hour, minute=random.randint(0, 59))

        commits.append(GitEvent(
            user_id=user_id,
            commit_sha=fake.sha1()[:40],
            commit_message=random.choice([
                "feat: implement user authentication",
                "fix: resolve API timeout issue",
                "refactor: extract service layer",
                "chore: update dependencies",
                "docs: add API documentation",
                "test: add unit tests for metrics service",
                "feat: add cost calculation endpoint",
            ]),
            repo=random.choice(REPOS),
            branch=random.choice(BRANCHES),
            files_changed=random.randint(1, 15),
            insertions=random.randint(10, 200),
            deletions=random.randint(0, 80),
            timestamp=commit_time,
        ))

    return commits


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print("🌱 Iniciando seed de datos demo...")

        db_users = []
        # Limpiar usuarios (opcional, por si ejecutamos repetidas veces)
        # Esto asume BD limpia o tests
        
        for user_data in DEMO_USERS:
            # Crear API key hash fake para el seed
            user = User(**user_data, api_key_hash=fake.sha256(), anonymize=False)
            session.add(user)
            db_users.append(user)

        await session.flush()

        now = datetime.now(tz=timezone.utc)
        start_date = now - timedelta(days=14)

        total_ai_events = 0
        total_git_events = 0

        for user in db_users:
            print(f"  👤 Generando datos para {user.username}...")

            for day_offset in range(14):
                date = start_date + timedelta(days=day_offset)
                weekday = date.weekday()

                if weekday >= 5:
                    intensity = random.uniform(0.0, 0.3)
                else:
                    intensity = random.uniform(0.4, 1.0)

                ai_events = generate_ai_events_for_day(user.id, date, intensity)
                git_events = generate_git_events_for_day(user.id, date, intensity)

                for event in ai_events:
                    session.add(event)
                for event in git_events:
                    session.add(event)

                total_ai_events += len(ai_events)
                total_git_events += len(git_events)

        await session.commit()
        print(f"\n✅ Seed completado:")
        print(f"   - {len(db_users)} usuarios creados")
        print(f"   - {total_ai_events} eventos IA generados")
        print(f"   - {total_git_events} eventos Git generados")


if __name__ == "__main__":
    asyncio.run(seed())
