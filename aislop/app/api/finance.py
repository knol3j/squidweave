from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.api.deps import verify_api_key
from app.models.finance import RevenueSnapshot, ExpenseRecord, StripeEvent
from app.services.report_service import generate_daily_report

router = APIRouter(prefix="/finance", tags=["finance"])
_auth = APIRouter(dependencies=[Depends(verify_api_key)])


@router.post("/stripe/webhook")
async def stripe_webhook():
    raise HTTPException(status_code=500, detail="Not implemented")


@_auth.get("/summary")
async def finance_summary(db: AsyncSession = Depends(get_session)):
    stmt = select(RevenueSnapshot).order_by(desc(RevenueSnapshot.created_at)).limit(1)
    result = await db.execute(stmt)
    rev = result.scalar_one_or_none()
    if not rev:
        return {"mrr_cents": 0, "arr_cents": 0, "active_subscribers": 0}
    return {
        "mrr_cents": rev.mrr_cents,
        "arr_cents": rev.arr_cents,
        "active_subscribers": rev.active_subscribers,
    }


@_auth.get("/revenue")
async def revenue_history(db: AsyncSession = Depends(get_session)):
    stmt = select(RevenueSnapshot).order_by(desc(RevenueSnapshot.created_at)).limit(30)
    result = await db.execute(stmt)
    return [
        {
            "snapshot_date": r.snapshot_date.isoformat() if r.snapshot_date else None,
            "mrr_cents": r.mrr_cents,
            "arr_cents": r.arr_cents,
            "active_subscribers": r.active_subscribers,
        }
        for r in list(result.scalars().all())
    ]


router.include_router(_auth)
