import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.report_service import generate_daily_report

@pytest.mark.asyncio
async def test_generate_daily_report_empty(db_session: AsyncSession):
    report = await generate_daily_report(db_session)
    assert "date" in report
    assert "revenue" in report
    assert "expenses" in report
