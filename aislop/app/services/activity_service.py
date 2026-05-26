import json
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog
from app.core.redis_client import get_redis


async def log_activity(
    db: AsyncSession, activity_type: str, description: str, metadata: dict | None = None
) -> ActivityLog:
    record = ActivityLog(
        activity_type=activity_type,
        description=description,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    try:
        r = await get_redis()
        await r.lpush("activity:recent", json.dumps({
            "type": activity_type,
            "description": description,
            "metadata": metadata,
        }))
        await r.ltrim("activity:recent", 0, 99)
    except Exception:
        pass

    return record


async def get_recent_activity(
    db: AsyncSession, limit: int = 20
) -> list[ActivityLog]:
    stmt = (
        select(ActivityLog)
        .order_by(desc(ActivityLog.created_at), desc(ActivityLog.id))
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
