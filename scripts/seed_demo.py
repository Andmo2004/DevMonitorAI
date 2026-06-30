"""
Script de seed para poblar la base de datos con datos de demo a gran escala.

Genera entre NUM_USERS usuarios (configurable, 100-200 por defecto: 150) con
DAYS_OF_HISTORY días de actividad realista de eventos IA y Git, pensado para
estresar el dashboard y los KPIs con volumen suficiente para una demo creíble.

Uso:
    cd backend
    python ../scripts/seed_demo.py

Variables de entorno opcionales:
    SEED_NUM_USERS   (default: 150)   — número de usuarios a generar (100-200 recomendado)
    SEED_DAYS         (default: 30)    — días de histórico de actividad
"""
import asyncio
import os
import random
from datetime import datetime, timedelta, timezone

from faker import Faker

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import AsyncSessionLocal, engine, Base
from app.models import User, AIEvent, GitEvent, Insight
from app.core.pricing import calculate_cost_eur

fake = Faker("es_ES")
random.seed(42)  # Reproducible
Faker.seed(42)

# --- Configuración de escala ---
NUM_USERS = int(os.getenv("SEED_NUM_USERS", "150"))       # 100-200 recomendado
DAYS_OF_HISTORY = int(os.getenv("SEED_DAYS", "120"))         # ~4 meses de histórico (antes 14 -> 30 -> 120)
BATCH_SIZE = 1000                                             # tamaño de lote para flush periódico

ROLES = [
    ("developer", 0.78),
    ("admin", 0.07),
    ("lead", 0.10),
    ("qa", 0.05),
]

TEAMS = [
    "Platform",
    "Frontend",
    "Backend",
    "Data",
    "DevOps",
    "Mobile",
    "QA",
    "Growth",
    "Security",
    None,  # algunos usuarios sin equipo asignado
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
    ("claude-sonnet-4-6", 0.65),
    ("claude-haiku-4-5-20251001", 0.27),
    ("claude-opus-4-6", 0.08),
]

REPOS = [
    "devmonitor-ai",
    "api-gateway",
    "frontend-portal",
    "data-pipeline",
    "infra-terraform",
    "mobile-app",
    "auth-service",
    "billing-service",
    "notifications-worker",
    "analytics-engine",
    "design-system",
    "internal-tools",
]

BRANCHES = [
    "main",
    "develop",
    "feature/auth",
    "feature/dashboard",
    "fix/api-timeout",
    "feature/billing-v2",
    "feature/mobile-push",
    "hotfix/security-patch",
    "chore/deps-update",
    "feature/onboarding",
]

COMMIT_MESSAGES = [
    "feat: implement user authentication",
    "fix: resolve API timeout issue",
    "refactor: extract service layer",
    "chore: update dependencies",
    "docs: add API documentation",
    "test: add unit tests for metrics service",
    "feat: add cost calculation endpoint",
    "fix: correct timezone handling in events",
    "perf: optimize KPI aggregation query",
    "feat: add pagination to events feed",
    "fix: handle null prompt_text on anonymized users",
    "refactor: simplify insight prompt builder",
    "chore: bump anthropic sdk version",
    "feat: add retention policy enforcement",
    "fix: prevent race condition in event creation",
    "test: cover git correlation edge cases",
    "feat: add team filter to dashboard",
    "style: format code with ruff",
    "fix: correct cost rounding precision",
    "feat: add CSV export for KPIs",
]


def weighted_choice(choices: list[tuple]) -> str:
    """Elige un elemento con probabilidad ponderada."""
    items, weights = zip(*choices)
    return random.choices(items, weights=weights, k=1)[0]


def generate_users(num_users: int) -> list[dict]:
    """Genera datos de usuarios únicos (username/email) usando Faker."""
    users_data = []
    seen_usernames: set[str] = set()

    for _ in range(num_users):
        first = fake.first_name().lower()
        last = fake.last_name().lower().replace(" ", "")
        base_username = f"{first}.{last}"
        username = base_username
        suffix = 1
        while username in seen_usernames:
            suffix += 1
            username = f"{base_username}{suffix}"
        seen_usernames.add(username)

        email = f"{username}@atmira.com"
        role = weighted_choice(ROLES)
        team = random.choice(TEAMS)

        users_data.append({
            "username": username,
            "email": email,
            "role": role,
            "team": team,
        })

    return users_data


def generate_ai_events_for_day(
    user_id: int, date: datetime, intensity: float
) -> list[AIEvent]:
    if intensity < 0.05:
        return []

    # Rango de eventos por día ampliado respecto a la versión original (más volumen)
    num_events = int(random.gauss(mu=10 * intensity, sigma=4))
    num_events = max(0, min(num_events, 30))

    events = []
    for _ in range(num_events):
        hour = random.randint(7, 21)
        minute = random.randint(0, 59)
        event_time = date.replace(hour=hour, minute=minute, second=random.randint(0, 59))

        model_id = weighted_choice(MODELS)
        prompt_type = weighted_choice(PROMPT_TYPES)

        tokens_in = int(random.gauss(mu=550, sigma=250))
        tokens_in = max(40, min(tokens_in, 3000))
        tokens_out = int(random.gauss(mu=850, sigma=350))
        tokens_out = max(80, min(tokens_out, 4000))

        cost_eur = calculate_cost_eur(model_id, tokens_in, tokens_out)

        events.append(AIEvent(
            user_id=user_id,
            model_id=model_id,
            prompt_type=prompt_type,
            prompt_text=None,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_eur=cost_eur,
            session_id=f"s-{user_id}-{date.strftime('%Y%m%d')}-{random.randint(1, 4)}",
            repo=random.choice(REPOS),
            timestamp=event_time,
        ))

    return events


def generate_git_events_for_day(
    user_id: int, date: datetime, ai_intensity: float
) -> list[GitEvent]:
    if ai_intensity < 0.15 or random.random() > (0.55 + ai_intensity * 0.35):
        return []

    num_commits = random.choices([1, 2, 3, 4], weights=[0.40, 0.30, 0.20, 0.10])[0]

    commits = []
    for _ in range(num_commits):
        hour = random.randint(9, 21)
        commit_time = date.replace(hour=hour, minute=random.randint(0, 59))

        commits.append(GitEvent(
            user_id=user_id,
            commit_sha=fake.sha1()[:40],
            commit_message=random.choice(COMMIT_MESSAGES),
            repo=random.choice(REPOS),
            branch=random.choice(BRANCHES),
            files_changed=random.randint(1, 20),
            insertions=random.randint(5, 300),
            deletions=random.randint(0, 120),
            timestamp=commit_time,
        ))

    return commits


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print(f"🌱 Iniciando seed de datos demo a gran escala...")
        print(f"   👥 Usuarios a generar: {NUM_USERS}")
        print(f"   📅 Días de histórico: {DAYS_OF_HISTORY}")

        users_data = generate_users(NUM_USERS)
        db_users = []

        for user_data in users_data:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                role=user_data["role"],
                team=user_data["team"],
                api_key_hash=fake.sha256(),
                anonymize=random.random() < 0.15,  # ~15% con anonimización activada
                cost_alert_eur_day=round(random.uniform(0.5, 5.0), 2) if random.random() < 0.4 else None,
                retention_days=random.choice([30, 60, 90, 180, 365]),
            )
            session.add(user)
            db_users.append(user)

        await session.flush()

        now = datetime.now(tz=timezone.utc)
        start_date = now - timedelta(days=DAYS_OF_HISTORY)

        total_ai_events = 0
        total_git_events = 0
        pending_objects = 0

        for idx, user in enumerate(db_users, start=1):
            if idx % 25 == 0 or idx == 1:
                print(f"  👤 Generando datos para usuario {idx}/{len(db_users)} ({user.username})...")

            # Cada usuario tiene un "perfil de actividad" base distinto para variar el dataset
            base_activity = random.uniform(0.3, 1.0)

            for day_offset in range(DAYS_OF_HISTORY):
                date = start_date + timedelta(days=day_offset)
                weekday = date.weekday()

                if weekday >= 5:
                    intensity = random.uniform(0.0, 0.25) * base_activity
                else:
                    intensity = random.uniform(0.35, 1.0) * base_activity

                ai_events = generate_ai_events_for_day(user.id, date, intensity)
                git_events = generate_git_events_for_day(user.id, date, intensity)

                for event in ai_events:
                    session.add(event)
                for event in git_events:
                    session.add(event)

                total_ai_events += len(ai_events)
                total_git_events += len(git_events)
                pending_objects += len(ai_events) + len(git_events)

                # Flush periódico para no acumular demasiados objetos en memoria/sesión
                if pending_objects >= BATCH_SIZE:
                    await session.flush()
                    pending_objects = 0

        await session.commit()

        print(f"\n✅ Seed completado:")
        print(f"   - {len(db_users)} usuarios creados")
        print(f"   - {total_ai_events:,} eventos IA generados")
        print(f"   - {total_git_events:,} eventos Git generados")
        print(f"   - Rango temporal: {start_date.date()} → {now.date()}")


if __name__ == "__main__":
    asyncio.run(seed())