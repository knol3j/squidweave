import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.api.deps import verify_api_key
from app.models.social import Post
from app.models.tasks import Task
from app.services.activity_service import get_recent_activity
from app.services.report_service import generate_daily_report

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(verify_api_key)])


@router.get("/summary")
async def dashboard_summary(db: AsyncSession = Depends(get_session)):
    post_count_result = await db.execute(select(sa_func.count(Post.id)))
    post_count = post_count_result.scalar() or 0

    task_count_result = await db.execute(select(sa_func.count(Task.id)))
    task_count = task_count_result.scalar() or 0

    activity = await get_recent_activity(db, limit=5)

    return {
        "total_posts": post_count,
        "total_tasks": task_count,
        "recent_activity": [
            {
                "type": a.activity_type,
                "description": a.description,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in activity
        ],
    }


@router.get("/activity")
async def dashboard_activity(
    limit: int = 20, db: AsyncSession = Depends(get_session)
):
    activity = await get_recent_activity(db, limit=limit)
    return [
        {
            "id": a.id,
            "type": a.activity_type,
            "description": a.description,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in activity
    ]


@router.get("/reports/daily")
async def daily_report(db: AsyncSession = Depends(get_session)):
    report = await generate_daily_report(db, datetime.date.today())
    return report
