"""API module - Router registration."""
from fastapi import APIRouter
from .sites import router as sites_router
from .devices import router as devices_router
from .telemetry import router as telemetry_router
from .alarms import router as alarms_router
from .stats import router as stats_router

api_router = APIRouter()

api_router.include_router(sites_router)
api_router.include_router(devices_router)
api_router.include_router(telemetry_router)
api_router.include_router(alarms_router)
api_router.include_router(stats_router)
