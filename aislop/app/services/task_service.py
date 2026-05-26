from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tasks import Task
from app.schemas.tasks import TaskCreateRequest


async def create_task(db: AsyncSession, req: TaskCreateRequest) -> Task:
    task = Task(
        title=req.title,
        description=req.description,
        agent_type=req.agent_type,
        task_metadata=req.metadata,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    stmt = select(Task).where(Task.id == task_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_tasks(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Task]:
    stmt = select(Task).order_by(desc(Task.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
