import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

from app.main import app
from app.core.database import get_db, Base
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.models import User, Insight
import app.routers.insights as insights_router

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    engine_test, class_=AsyncSession, expire_on_commit=False
)

async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"  # type: ignore[arg-type]
    ) as ac:
        yield ac

@pytest_asyncio.fixture
async def test_user():
    async with TestSessionLocal() as session:
        user = User(
            username="insight.user",
            email="insight@test.com",
            anonymize=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

@pytest.mark.asyncio
async def test_get_latest_insight_empty(client):
    """GET /api/v1/insights/latest devuelve 404 si no hay insights."""
    response = await client.get("/api/v1/insights/latest")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_latest_insight_exists(client, test_user):
    """GET /api/v1/insights/latest devuelve el más reciente."""
    async with TestSessionLocal() as session:
        now = datetime.now(timezone.utc)
        insight = Insight(
            user_id=test_user.id,
            period_start=now,
            period_end=now,
            content="Insight de prueba",
            model_used="claude-test",
            tokens_used=100
        )
        session.add(insight)
        await session.commit()

    response = await client.get("/api/v1/insights/latest")
    assert response.status_code == 200
    assert response.json()["content"] == "Insight de prueba"

@pytest.mark.asyncio
async def test_generate_insight_no_users(client):
    """POST /api/v1/insights/generate falla si no hay usuarios y es global."""
    response = await client.post("/api/v1/insights/generate", json={"period": "week"})
    # Status code 503 because it raises 404 in build_summary but handled as 503 by generate_insight block
    assert response.status_code == 503
