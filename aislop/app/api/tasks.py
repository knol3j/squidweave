from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.api.deps import verify_api_key
from app.schemas.tasks import TaskCreateRequest, TaskResponse
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"], dependencies=[Depends(verify_api_key)])


@router.get("")
async def list_tasks(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_session)
):
    tasks = await task_service.list_tasks(db, skip=skip, limit=limit)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("", status_code=201)
async def create_task(
    req: TaskCreateRequest, db: AsyncSession = Depends(get_session)
):
    task = await task_service.create_task(db, req)
    return TaskResponse.model_validate(task)


@router.get("/{task_id}")
async def get_task(task_id: int, db: AsyncSession = Depends(get_session)):
    task = await task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.model_validate(task)
