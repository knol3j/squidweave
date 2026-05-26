import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.task_service import create_task, get_task, list_tasks
from app.schemas.tasks import TaskCreateRequest

@pytest.mark.asyncio
async def test_create_task(db_session: AsyncSession):
    req = TaskCreateRequest(title="Test Task", description="desc", metadata="some meta")
    task = await create_task(db_session, req)
    assert task.id is not None
    assert task.title == "Test Task"
    assert task.task_metadata == "some meta"

@pytest.mark.asyncio
async def test_get_task_found(db_session: AsyncSession):
    req = TaskCreateRequest(title="Find Me")
    task = await create_task(db_session, req)
    found = await get_task(db_session, task.id)
    assert found is not None
    assert found.id == task.id

@pytest.mark.asyncio
async def test_get_task_not_found(db_session: AsyncSession):
    found = await get_task(db_session, 9999)
    assert found is None

@pytest.mark.asyncio
async def test_list_tasks(db_session: AsyncSession):
    for i in range(3):
        await create_task(db_session, TaskCreateRequest(title=f"Task {i}"))
    tasks = await list_tasks(db_session)
    assert len(tasks) >= 3
