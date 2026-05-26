from typing import Any

from pydantic import BaseModel
import datetime


class MemoryStoreRequest(BaseModel):
    category: str
    title: str
    content: str
    source: str | None = None
    tags: list[str] = []


class MemoryEntryResponse(BaseModel):
    id: int
    category: str
    title: str
    content: str
    source: str | None = None
    tags: list[str] = []
    created_at: datetime.datetime | None = None

    model_config = {"from_attributes": True}


class HermesMemoryEntry(BaseModel):
    scope: str
    category: str
    text: str
    metadata: dict[str, Any] = {}


class HermesUpsertRequest(BaseModel):
    campaignId: str
    entries: list[HermesMemoryEntry]


class HermesRecallRequest(BaseModel):
    campaignId: str
    query: str = ""
    targetId: str | None = None
    limit: int = 8
