"""
Tests para los endpoints de eventos (F2-01 y F2-02).

F2-01 POST /api/v1/events/ai:
- Creación exitosa de evento IA con cálculo de coste.
- Rechazo con 404 si el user_id no existe.
- Anonimización: prompt_text se elimina si user.anonymize=True.

F2-02 POST /api/v1/events/git:
- Creación exitosa de evento Git con datos de commit.
- Rechazo con 404 si el user_id no existe.
- Validación de commit_sha (min 7 caracteres).
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.core.database import get_db, Base
from app.models import User

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
    """Crea un usuario de prueba con anonymize=False."""
    async with TestSessionLocal() as session:
        user = User(
            username="test.user",
            email="test@test.com",
            anonymize=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def anon_user():
    """Crea un usuario de prueba con anonymize=True."""
    async with TestSessionLocal() as session:
        user = User(
            username="anon.user",
            email="anon@test.com",
            anonymize=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


# ---------- Tests POST /api/v1/events/ai ----------

@pytest.mark.asyncio
async def test_create_ai_event_success(client, test_user):
    """POST con datos válidos → 201 y coste calculado correctamente."""
    response = await client.post("/api/v1/events/ai", json={
        "user_id": test_user.id,
        "model_id": "claude-sonnet-4-6",
        "prompt_type": "code_generation",
        "prompt_text": "Escribe una función Fibonacci",
        "tokens_in": 500,
        "tokens_out": 800,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == test_user.id
    assert data["model_id"] == "claude-sonnet-4-6"
    assert data["prompt_type"] == "code_generation"
    assert data["prompt_text"] == "Escribe una función Fibonacci"
    assert data["cost_eur"] > 0
    assert data["tokens_in"] == 500
    assert data["tokens_out"] == 800
    assert "id" in data
    assert "timestamp" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_ai_event_invalid_user(client):
    """POST con user_id inexistente → 404."""
    response = await client.post("/api/v1/events/ai", json={
        "user_id": 99999,
        "model_id": "claude-sonnet-4-6",
        "prompt_type": "code_generation",
        "tokens_in": 500,
        "tokens_out": 800,
    })
    assert response.status_code == 404
    data = response.json()
    assert "no encontrado" in data["detail"].lower() or "99999" in data["detail"]


@pytest.mark.asyncio
async def test_create_ai_event_anonymized(client, anon_user):
    """POST con usuario anonymize=True → 201 pero prompt_text es None."""
    response = await client.post("/api/v1/events/ai", json={
        "user_id": anon_user.id,
        "model_id": "claude-sonnet-4-6",
        "prompt_type": "code_generation",
        "prompt_text": "Escribe una función para calcular primos",
        "response_text": "Aquí tienes la función...",
        "tokens_in": 500,
        "tokens_out": 800,
    })
    assert response.status_code == 201
    data = response.json()
    # El prompt_text NO debe aparecer si el usuario tiene anonymize=True
    assert data.get("prompt_text") is None
    assert data.get("response_text") is None
    # Pero el coste sí debe calcularse
    assert data["cost_eur"] > 0


@pytest.mark.asyncio
async def test_create_ai_event_cost_calculation(client, test_user):
    """Verifica que el coste se calcula correctamente según la tabla de precios."""
    response = await client.post("/api/v1/events/ai", json={
        "user_id": test_user.id,
        "model_id": "claude-sonnet-4-6",
        "prompt_type": "debugging",
        "tokens_in": 1_000_000,   # 1M tokens input
        "tokens_out": 1_000_000,  # 1M tokens output
    })
    assert response.status_code == 201
    data = response.json()
    # claude-sonnet-4-6: $3/M input + $15/M output = $18 * 0.92 EUR = 16.56 EUR
    expected_cost = round((3.0 + 15.0) * 0.92, 6)
    assert data["cost_eur"] == expected_cost


@pytest.mark.asyncio
async def test_create_ai_event_validation_error(client):
    """POST con datos inválidos (tokens negativos) → 422."""
    response = await client.post("/api/v1/events/ai", json={
        "user_id": 1,
        "model_id": "claude-sonnet-4-6",
        "prompt_type": "code_generation",
        "tokens_in": -10,  # No válido, ge=0
        "tokens_out": 800,
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_ai_event_missing_required_fields(client):
    """POST sin campos obligatorios → 422."""
    response = await client.post("/api/v1/events/ai", json={
        "user_id": 1,
        # Falta model_id, prompt_type, tokens_in, tokens_out
    })
    assert response.status_code == 422


# ---------- Tests POST /api/v1/events/git (F2-02) ----------

@pytest.mark.asyncio
async def test_create_git_event_success(client, test_user):
    """POST con datos válidos → 201 y datos del commit correctos."""
    from datetime import datetime, timezone

    ts = datetime.now(timezone.utc).isoformat()
    response = await client.post("/api/v1/events/git", json={
        "user_id": test_user.id,
        "commit_sha": "abc123def456abc123def456abc123def456abc1",
        "commit_message": "feat: add correlation endpoint",
        "repo": "devmonitor-ai",
        "branch": "develop",
        "files_changed": 5,
        "insertions": 120,
        "deletions": 30,
        "timestamp": ts,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["commit_sha"] == "abc123def456abc123def456abc123def456abc1"
    assert data["commit_message"] == "feat: add correlation endpoint"
    assert data["repo"] == "devmonitor-ai"
    assert data["branch"] == "develop"
    assert data["files_changed"] == 5
    assert data["user_id"] == test_user.id
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_git_event_invalid_user(client):
    """POST con user_id inexistente → 404."""
    from datetime import datetime, timezone

    response = await client.post("/api/v1/events/git", json={
        "user_id": 99999,
        "commit_sha": "abc123def456abc123def456abc123def456abc1",
        "repo": "devmonitor-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    assert response.status_code == 404
    data = response.json()
    assert "no encontrado" in data["detail"].lower() or "99999" in data["detail"]


@pytest.mark.asyncio
async def test_create_git_event_short_sha(client):
    """POST con commit_sha menor a 7 caracteres → 422."""
    from datetime import datetime, timezone

    response = await client.post("/api/v1/events/git", json={
        "user_id": 1,
        "commit_sha": "abc",  # Demasiado corto, min_length=7
        "repo": "devmonitor-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_git_event_missing_required_fields(client):
    """POST sin campos obligatorios → 422."""
    response = await client.post("/api/v1/events/git", json={
        "user_id": 1,
        # Falta commit_sha, repo, timestamp
    })
    assert response.status_code == 422
