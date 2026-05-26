from pydantic import BaseModel
import datetime


class TaskCreateRequest(BaseModel):
    title: str
    description: str | None = None
    agent_type: str | None = None
    metadata: str | None = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    status: str
    agent_type: str | None = None
    task_metadata: str | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}
