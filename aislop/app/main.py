from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.events import startup, shutdown
from app.api import health, tasks, memory, social, config, finance, dashboard
from app.api.v1.agents import router as agents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup()
    yield
    await shutdown()


app = FastAPI(title="Aislop AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(memory.router, prefix="/api/v1")
app.include_router(social.router, prefix="/api/v1")
app.include_router(config.router, prefix="/api/v1")
app.include_router(finance.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
