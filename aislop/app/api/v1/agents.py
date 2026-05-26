from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import verify_api_key
from app.agents.crew_factory import get_agent

router = APIRouter(prefix="/agents", tags=["agents"], dependencies=[Depends(verify_api_key)])


@router.post("/trigger")
async def trigger_agent(task: str):
    agent = get_agent("default")
    result = await agent.run(task)
    return {"status": "completed", "result": result}


@router.get("/status/{agent_id}")
async def agent_status(agent_id: str):
    return {"agent_id": agent_id, "status": "idle"}
