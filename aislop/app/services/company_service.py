from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.config import CompanyConfig


async def get_company_config(db: AsyncSession) -> CompanyConfig | None:
    stmt = select(CompanyConfig).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def upsert_company_config(
    db: AsyncSession, company_name: str, industry: str | None = None, settings_json: str | None = None
) -> CompanyConfig:
    existing = await get_company_config(db)
    if existing:
        existing.company_name = company_name
        if industry is not None:
            existing.industry = industry
        if settings_json is not None:
            existing.settings_json = settings_json
    else:
        existing = CompanyConfig(
            company_name=company_name,
            industry=industry,
            settings_json=settings_json,
        )
        db.add(existing)
    await db.commit()
    await db.refresh(existing)
    return existing
