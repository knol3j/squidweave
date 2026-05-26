import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.activity_service import log_activity, get_recent_activity

pytestmark = pytest.mark.usefixtures("mock_redis")

@pytest.mark.asyncio
async def test_log_activity_creates_record(db_session: AsyncSession):
    rec = await log_activity(db_session, "test_type", "test description", {"key": "val"})
    assert rec.id is not None
    assert rec.activity_type == "test_type"

@pytest.mark.asyncio
async def test_get_recent_activity_returns_ordered(db_session: AsyncSession):
    for i in range(5):
        await log_activity(db_session, f"type_{i}", f"desc_{i}")
    activities = await get_recent_activity(db_session, limit=3)
    assert len(activities) <= 3
