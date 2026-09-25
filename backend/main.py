"""FlowPilot API — Phase 1 foundation."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import agents, analytics, approvals, audit, documents, processes, workflows
from config import settings
from models.schemas import HealthResponse
from services.database import SessionLocal, init_db
from services.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api")
app.include_router(processes.router, prefix="/api")
app.include_router(workflows.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(approvals.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", app=settings.app_name)
