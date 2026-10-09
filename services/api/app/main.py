import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.models import models
from app.worker.scheduler import start_scheduler, shutdown_scheduler
from app.services.notification_service import ws_manager

# Import all routers
from app.routes.auth import router as auth_router
from app.routes.elderly import router as elderly_router
from app.routes.caregivers import router as caregivers_router
from app.routes.cameras import router as cameras_router
from app.routes.zones import router as zones_router
from app.routes.falls import router as falls_router
from app.routes.alerts import router as alerts_router
from app.routes.medications import router as medications_router
from app.routes.health import router as health_router
from app.routes.events import router as events_router
from app.routes.notifications import router as notifications_router
from app.routes.assistant import router as assistant_router
from app.routes.contacts import router as contacts_router
from app.routes.audit import router as audit_router
from app.routes.demo import router as demo_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("leo.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Start background scheduled jobs
    logger.info("Starting background scheduler worker...")
    start_scheduler()

    yield

    # Shutdown
    logger.info("Stopping background scheduler...")
    shutdown_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="EdCare AI-Powered Elderly Care & Safety Monitoring Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Real-time WebSocket Gateway
@app.websocket(f"{settings.API_V1_STR}/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: str = ""):
    await ws_manager.connect(websocket, user_id=user_id if user_id else None)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle keep-alive pings or client heartbeats
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id=user_id if user_id else None)

# Mount Routes
api_v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1)
app.include_router(elderly_router, prefix=api_v1)
app.include_router(caregivers_router, prefix=api_v1)
app.include_router(cameras_router, prefix=api_v1)
app.include_router(zones_router, prefix=api_v1)
app.include_router(falls_router, prefix=api_v1)
app.include_router(alerts_router, prefix=api_v1)
app.include_router(medications_router, prefix=api_v1)
app.include_router(health_router, prefix=api_v1)
app.include_router(events_router, prefix=api_v1)
app.include_router(notifications_router, prefix=api_v1)
app.include_router(assistant_router, prefix=api_v1)
app.include_router(contacts_router, prefix=api_v1)
app.include_router(audit_router, prefix=api_v1)
app.include_router(demo_router, prefix=api_v1)

@app.get("/healthz", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "EdCare API", "version": settings.VERSION}
