import datetime
from typing import Any
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import RevenueSnapshot, ExpenseRecord


async def generate_daily_report(db: AsyncSession, date: datetime.date | None = None) -> dict[str, Any]:
    target = date or datetime.date.today()

    rev_stmt = select(RevenueSnapshot).where(
        sa_func.date(RevenueSnapshot.snapshot_date) == target
    ).order_by(RevenueSnapshot.created_at.desc()).limit(1)
    rev_result = await db.execute(rev_stmt)
    rev = rev_result.scalar_one_or_none()

    exp_stmt = select(ExpenseRecord).where(
        sa_func.date(ExpenseRecord.date) == target
    )
    exp_result = await db.execute(exp_stmt)
    expenses = list(exp_result.scalars().all())

    return {
        "date": target.isoformat(),
        "revenue": {
            "mrr_cents": rev.mrr_cents if rev else 0,
            "arr_cents": rev.arr_cents if rev else 0,
            "active_subscribers": rev.active_subscribers if rev else 0,
            "new_today": rev.new_today if rev else 0,
            "churned_today": rev.churned_today if rev else 0,
        },
        "expenses": [
            {
                "category": e.category,
                "vendor": e.vendor,
                "amount_cents": e.amount_cents,
                "currency": e.currency,
            }
            for e in expenses
        ],
        "total_expense_cents": sum(e.amount_cents or 0 for e in expenses),
    }
