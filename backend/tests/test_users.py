import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db, Base
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.models import User

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
            username="policy.user",
            email="policy@test.com",
            anonymize=False,
            cost_alert_eur_day=1.5,
            retention_days=30
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.mark.asyncio
async def test_get_user(client, test_user):
    response = await client.get(f"/api/v1/users/{test_user.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "policy.user"
    assert data["anonymize"] is False


@pytest.mark.asyncio
async def test_get_user_not_found(client):
    response = await client.get("/api/v1/users/9999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_users(client, test_user):
    response = await client.get("/api/v1/users/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == test_user.id


@pytest.mark.asyncio
async def test_update_user_policy(client, test_user):
    # Only update anonymize
    response = await client.post(
        f"/api/v1/users/{test_user.id}/policy",
        json={"anonymize": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["anonymize"] is True
    # Others should remain the same
    assert data["cost_alert_eur_day"] == 1.5
    assert data["retention_days"] == 30

    # Let's test that the AI event endpoint now anonymizes
    response_ai = await client.post("/api/v1/events/ai", json={
        "user_id": test_user.id,
        "model_id": "claude-test",
        "prompt_type": "code_generation",
        "prompt_text": "Este texto NO debe guardarse",
        "tokens_in": 100,
        "tokens_out": 200
    })
    assert response_ai.status_code == 201
    assert response_ai.json()["prompt_text"] is None


@pytest.mark.asyncio
async def test_update_user_policy_not_found(client):
    response = await client.post(
        "/api/v1/users/9999/policy",
        json={"anonymize": True}
    )
    assert response.status_code == 404
