import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.database import Base, get_session
from app.config import settings

settings.api_key = "test-key"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()

@pytest_asyncio.fixture
async def client(db_session):
    from app.main import app
    app.dependency_overrides[get_session] = lambda: db_session
    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    return {"X-API-Key": "test-key"}

@pytest.fixture
def mock_redis():
    mock_conn = AsyncMock()
    mock_conn.lpush = AsyncMock(return_value=1)
    mock_conn.ltrim = AsyncMock(return_value=True)
    with patch("redis.asyncio.from_url", return_value=mock_conn):
        with patch("app.core.redis_client.get_redis", AsyncMock(return_value=mock_conn)):
            yield mock_conn

@pytest.fixture
def mock_chroma(mocker):
    mock_collection = MagicMock()
    mock_collection.add = MagicMock()
    mock_collection.query = MagicMock(return_value={
        "ids": [["test-id"]],
        "documents": [["test content"]],
        "metadatas": [[{"category": "test", "title": "test", "source": "", "tags": "tag1,tag2"}]],
        "distances": [[0.5]],
    })
    mock_collection.get = MagicMock(return_value={
        "ids": [],
        "documents": [],
        "metadatas": [],
    })
    mock_client = MagicMock()
    mock_client.get_or_create_collection = MagicMock(return_value=mock_collection)
    mocker.patch("chromadb.PersistentClient", return_value=mock_client)
    return mock_collection
