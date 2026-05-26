import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.company_service import get_company_config, upsert_company_config

@pytest.mark.asyncio
async def test_get_company_config_no_data(db_session: AsyncSession):
    cfg = await get_company_config(db_session)
    assert cfg is None

@pytest.mark.asyncio
async def test_upsert_creates_new_config(db_session: AsyncSession):
    cfg = await upsert_company_config(db_session, "TestCorp", "tech")
    assert cfg.company_name == "TestCorp"
    assert cfg.industry == "tech"

@pytest.mark.asyncio
async def test_upsert_updates_existing(db_session: AsyncSession):
    cfg = await upsert_company_config(db_session, "Original", "finance")
    updated = await upsert_company_config(db_session, "UpdatedCorp", "ai")
    assert updated.id == cfg.id
    assert updated.company_name == "UpdatedCorp"
