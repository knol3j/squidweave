from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.api.deps import verify_api_key
from app.models.social import Post

router = APIRouter(prefix="/social", tags=["social"], dependencies=[Depends(verify_api_key)])


@router.get("/posts")
async def list_posts(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Post).order_by(desc(Post.created_at))
    if status:
        stmt = stmt.where(Post.status == status)
    result = await db.execute(stmt)
    posts = list(result.scalars().all())
    return [
        {
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "status": p.status,
            "platform": p.platform,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in posts
    ]
