from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import verify_api_key
from app.schemas.memory import MemoryStoreRequest, HermesUpsertRequest, HermesRecallRequest
from app.services.memory_service import store_memory, search_memory, list_memories, hermes_upsert, hermes_recall

router = APIRouter(prefix="/memory", tags=["memory"], dependencies=[Depends(verify_api_key)])


@router.get("")
async def get_memories(q: str | None = Query(None)):
    if q:
        results = await search_memory(q)
    else:
        results = await list_memories()
    return results


@router.post("", status_code=201)
async def create_memory(req: MemoryStoreRequest):
    result = await store_memory(
        category=req.category,
        title=req.title,
        content=req.content,
        source=req.source,
        tags=req.tags,
    )
    return result


@router.post("/upsert")
async def upsert_memories(req: HermesUpsertRequest):
    result = await hermes_upsert(
        campaign_id=req.campaignId,
        entries=[e.model_dump() for e in req.entries],
    )
    return result


@router.post("/recall")
async def recall_memories(req: HermesRecallRequest):
    items = await hermes_recall(
        campaign_id=req.campaignId,
        query=req.query,
        target_id=req.targetId,
        limit=req.limit,
    )
    return {"items": items}
