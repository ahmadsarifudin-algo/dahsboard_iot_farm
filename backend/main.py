"""
IoT Data Center Dashboard - FastAPI Backend
Main application entry point.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import init_db
from app.core.redis import redis_manager
from app.api import api_router
from app.services.mqtt_service import mqtt_service
from app.services.websocket_service import ws_manager, websocket_endpoint

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager."""
    # Startup
    print("Starting IoT Dashboard Backend...")
    
    # Initialize database
    await init_db()
    print("Database initialized")
    
    # Connect to Redis (optional)
    await redis_manager.connect()
    
    # Start MQTT subscriber in background (optional)
    mqtt_task = asyncio.create_task(mqtt_service.start())
    
    # Start WebSocket Redis subscriber in background (only if Redis available)
    ws_task = asyncio.create_task(ws_manager.start_redis_subscriber())
    
    print("Services started")
    print(f"API running at http://localhost:8000{settings.api_v1_prefix}")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    await mqtt_service.stop()
    await ws_manager.stop()
    mqtt_task.cancel()
    ws_task.cancel()
    await redis_manager.disconnect()
    print("Cleanup complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Production-ready IoT Data Center Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.api_v1_prefix)


# WebSocket endpoint
@app.websocket("/ws")
async def ws_route(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket_endpoint(websocket)


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "1.0.0",
        "redis": "connected" if redis_manager.is_connected else "in-memory fallback",
        "mqtt": "enabled" if settings.mqtt_enabled else "disabled",
    }


# Root redirect to docs
@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "message": "IoT Data Center Dashboard API",
        "docs": "/docs",
        "health": "/health",
        "websocket": "/ws"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
