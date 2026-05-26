from fastapi import APIRouter
from app.api.v1.agents import router as v1_agents_router

router = APIRouter()
router.include_router(v1_agents_router)
