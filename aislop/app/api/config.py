from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.api.deps import verify_api_key
from app.services.company_service import get_company_config, upsert_company_config

router = APIRouter(prefix="/config", tags=["config"], dependencies=[Depends(verify_api_key)])


@router.get("")
async def read_config(db: AsyncSession = Depends(get_session)):
    cfg = await get_company_config(db)
    if cfg is None:
        raise HTTPException(status_code=404, detail="Company config not found")
    return {
        "id": cfg.id,
        "company_name": cfg.company_name,
        "industry": cfg.industry,
        "settings_json": cfg.settings_json,
        "created_at": cfg.created_at.isoformat() if cfg.created_at else None,
        "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None,
    }


@router.put("")
async def upsert_config(
    company_name: str,
    industry: str | None = None,
    settings_json: str | None = None,
    db: AsyncSession = Depends(get_session),
):
    cfg = await upsert_company_config(db, company_name, industry, settings_json)
    return {
        "id": cfg.id,
        "company_name": cfg.company_name,
        "industry": cfg.industry,
        "settings_json": cfg.settings_json,
        "created_at": cfg.created_at.isoformat() if cfg.created_at else None,
        "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None,
    }
