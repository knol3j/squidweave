from app.core.database import async_session_factory, engine, Base
from app.core.redis_client import close_redis

async def populate_defaults():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with async_session_factory() as session:
            from app.services.company_service import get_company_config
            existing = await get_company_config(session)
            if existing is None:
                from app.models.config import CompanyConfig
                cfg = CompanyConfig(company_name="Aislop AI", industry="technology")
                session.add(cfg)
                await session.commit()
    except Exception:
        pass

async def startup():
    await populate_defaults()

async def shutdown():
    await close_redis()
