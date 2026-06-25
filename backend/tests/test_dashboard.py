"""
Tests para GET /api/v1/dashboard/kpis (F2-03).

Cubre:
- Respuesta vacía sin datos → todos los campos a 0/vacío.
- KPIs correctos con eventos de IA insertados.
- Distribución de prompt_type ordenada por frecuencia.
- Correlación IA ↔ Git (daily_usage + correlation_data).
- Filtrado por user_id y por días.
"""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.core.database import get_db, Base
from app.models import User, AIEvent, GitEvent

# ---------- Configuración de BD de test (SQLite en memoria) ----------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    engine_test, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    """Dependency override que usa la BD de test en lugar de PostgreSQL."""
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


# ---------- Fixtures ----------

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Crea y destruye las tablas para cada test."""
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Cliente HTTP asíncrono para los tests."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"  # type: ignore[arg-type]
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user():
    """Crea un usuario de prueba."""
    async with TestSessionLocal() as session:
        user = User(
            username="kpi.user",
            email="kpi@test.com",
            anonymize=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def populated_user():
    """Crea un usuario con eventos IA y Git para testing de KPIs."""
    async with TestSessionLocal() as session:
        # Crear usuario
        user = User(
            username="data.user",
            email="data@test.com",
            anonymize=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        now = datetime.now(timezone.utc)

        # Insertar eventos IA (3 code_generation, 2 debugging, 1 refactoring)
        ai_events_data = [
            {"prompt_type": "code_generation", "tokens_in": 500, "tokens_out": 800,
             "cost_eur": 0.012, "session_id": "s1", "ts": now - timedelta(hours=2)},
            {"prompt_type": "code_generation", "tokens_in": 300, "tokens_out": 600,
             "cost_eur": 0.009, "session_id": "s1", "ts": now - timedelta(hours=1)},
            {"prompt_type": "debugging", "tokens_in": 400, "tokens_out": 700,
             "cost_eur": 0.011, "session_id": "s2", "ts": now - timedelta(days=1)},
            {"prompt_type": "debugging", "tokens_in": 200, "tokens_out": 500,
             "cost_eur": 0.007, "session_id": "s2", "ts": now - timedelta(days=1, hours=1)},
            {"prompt_type": "refactoring", "tokens_in": 600, "tokens_out": 900,
             "cost_eur": 0.015, "session_id": "s3", "ts": now - timedelta(days=2)},
            {"prompt_type": "code_generation", "tokens_in": 100, "tokens_out": 200,
             "cost_eur": 0.003, "session_id": "s3", "ts": now - timedelta(days=2, hours=1)},
        ]
        for data in ai_events_data:
            event = AIEvent(
                user_id=user.id,
                model_id="claude-sonnet-4-6",
                prompt_type=data["prompt_type"],
                tokens_in=data["tokens_in"],
                tokens_out=data["tokens_out"],
                cost_eur=data["cost_eur"],
                session_id=data["session_id"],
                timestamp=data["ts"],
            )
            session.add(event)

        # Insertar eventos Git (commits en los mismos días)
        git_events_data = [
            {"sha": "a" * 40, "msg": "feat: new feature", "ts": now - timedelta(hours=1)},
            {"sha": "b" * 40, "msg": "fix: bug fix", "ts": now - timedelta(days=1, hours=2)},
            {"sha": "c" * 40, "msg": "refactor: cleanup", "ts": now - timedelta(days=2, hours=2)},
        ]
        for data in git_events_data:
            event = GitEvent(
                user_id=user.id,
                commit_sha=data["sha"],
                commit_message=data["msg"],
                repo="devmonitor-ai",
                branch="develop",
                timestamp=data["ts"],
            )
            session.add(event)

        await session.commit()
        return user


# ---------- Tests GET /api/v1/dashboard/kpis ----------

@pytest.mark.asyncio
async def test_kpis_empty_data(client, test_user):
    """GET con usuario sin datos → respuesta válida con valores a 0."""
    response = await client.get(
        f"/api/v1/dashboard/kpis?user_id={test_user.id}&days=14"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_tokens"] == 0
    assert data["total_cost_eur"] == 0.0
    assert data["total_sessions"] == 0
    assert data["most_frequent_prompt_type"] == "N/A"
    assert data["correlated_commits_count"] == 0
    assert data["total_commits"] == 0
    assert data["correlated_commits_ratio"] == 0.0
    assert data["daily_usage"] == []
    assert data["prompt_type_distribution"] == []
    assert data["correlation_data"] == []


@pytest.mark.asyncio
async def test_kpis_with_data(client, populated_user):
    """GET con datos → total_tokens y total_cost > 0, con distribución correcta."""
    response = await client.get(
        f"/api/v1/dashboard/kpis?user_id={populated_user.id}&days=14"
    )
    assert response.status_code == 200
    data = response.json()

    # Totals
    assert data["total_tokens"] > 0
    assert data["total_cost_eur"] > 0
    assert data["total_sessions"] == 3  # s1, s2, s3

    # Most frequent prompt type
    assert data["most_frequent_prompt_type"] == "code_generation"  # 3 events

    # Prompt distribution ordered by frequency
    dist = data["prompt_type_distribution"]
    assert len(dist) == 3
    assert dist[0]["prompt_type"] == "code_generation"
    assert dist[0]["count"] == 3
    assert dist[1]["prompt_type"] == "debugging"
    assert dist[1]["count"] == 2
    assert dist[2]["prompt_type"] == "refactoring"
    assert dist[2]["count"] == 1

    # Percentages should sum to ~100
    total_pct = sum(d["percentage"] for d in dist)
    assert 99.0 <= total_pct <= 101.0

    # Daily usage should have entries
    assert len(data["daily_usage"]) > 0
    for day in data["daily_usage"]:
        assert "date" in day
        assert day["tokens"] > 0

    # Correlation data should have entries
    assert len(data["correlation_data"]) > 0
    
    assert data["total_commits"] == 3
    # Check that the ratio is between 0 and 100
    assert 0.0 <= data["correlated_commits_ratio"] <= 100.0


@pytest.mark.asyncio
async def test_kpis_correlation_ratio(client, populated_user):
    """Verifica que correlation_ratio es > 0 cuando hay días con IA y Git."""
    response = await client.get(
        f"/api/v1/dashboard/kpis?user_id={populated_user.id}&days=14"
    )
    assert response.status_code == 200
    data = response.json()

    # Todos los días tienen IA y Git, así que ratio debería ser 100%
    assert data["correlation_ratio"] == 100.0

@pytest.mark.asyncio
async def test_kpis_git_correlation_block(client, populated_user):
    response = await client.get(f"/api/v1/dashboard/kpis?user_id={populated_user.id}&days=14")
    data = response.json()
    gc = data["git_correlation"]
    assert gc["total_commits"] == data["total_commits"]
    assert gc["correlated_commits"] == data["correlated_commits_count"]
    assert gc["avg_per_commit"] >= 0
    assert gc["prompts_before_commit"] >= gc["correlated_commits"]

@pytest.mark.asyncio
async def test_kpis_nonexistent_user(client):
    """GET con user_id inexistente → respuesta vacía, no error 500."""
    response = await client.get("/api/v1/dashboard/kpis?user_id=99999&days=14")
    assert response.status_code == 200
    data = response.json()
    assert data["total_tokens"] == 0
    assert data["total_cost_eur"] == 0.0


@pytest.mark.asyncio
async def test_kpis_days_filter(client, populated_user):
    """GET con days=0 → solo eventos de hoy (si los hay)."""
    # Con days=0 no debería encontrar eventos (estamos en el pasado)
    response = await client.get(
        f"/api/v1/dashboard/kpis?user_id={populated_user.id}&days=1"
    )
    assert response.status_code == 200
    data = response.json()
    # Solo debería tener los eventos de hoy (2 AI events, 1 Git event)
    assert data["total_tokens"] > 0
    # Debería tener menos datos que con 14 días
    response_full = await client.get(
        f"/api/v1/dashboard/kpis?user_id={populated_user.id}&days=14"
    )
    data_full = response_full.json()
    assert data["total_tokens"] <= data_full["total_tokens"]


def test_calculate_ai_git_correlation_unit():
    """Test unitario para la lógica de correlación temporal."""
    from app.services.metrics import calculate_ai_git_correlation
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)

    # Mock events (sólo necesitamos timestamp)
    class MockEvent:
        def __init__(self, ts):
            self.timestamp = ts

    # Escenario 1: Un commit, un evento IA justo antes (dentro de 30 min)
    ai_events = [MockEvent(now - timedelta(minutes=15))]
    git_events = [MockEvent(now)]
    correlated, total = calculate_ai_git_correlation(
        ai_events, git_events, window_minutes=30  # type: ignore[arg-type]
    )
    assert correlated == 1
    assert total == 1

    # Escenario 2: Un commit, un evento IA antes pero fuera de la ventana (40 min)
    ai_events = [MockEvent(now - timedelta(minutes=40))]
    git_events = [MockEvent(now)]
    correlated, total = calculate_ai_git_correlation(
        ai_events, git_events, window_minutes=30  # type: ignore[arg-type]
    )
    assert correlated == 0
    assert total == 1

    # Escenario 3: Un commit, un evento IA después del commit (no debería contar)
    ai_events = [MockEvent(now + timedelta(minutes=10))]
    git_events = [MockEvent(now)]
    correlated, total = calculate_ai_git_correlation(
        ai_events, git_events, window_minutes=30  # type: ignore[arg-type]
    )
    assert correlated == 0
    assert total == 1

    # Escenario 4: Múltiples eventos IA en la ventana para el mismo commit (solo cuenta 1)
    ai_events = [
        MockEvent(now - timedelta(minutes=20)),
        MockEvent(now - timedelta(minutes=10))
    ]
    git_events = [MockEvent(now)]
    correlated, total = calculate_ai_git_correlation(
        ai_events, git_events, window_minutes=30  # type: ignore[arg-type]
    )
    assert correlated == 1
    assert total == 1

    # Escenario 5: Sin eventos
    assert calculate_ai_git_correlation([], [], window_minutes=30) == (0, 0)
    assert calculate_ai_git_correlation(
        ai_events, [], window_minutes=30  # type: ignore[arg-type]
    ) == (0, 0)
