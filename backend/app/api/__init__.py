"""API module - Router registration."""
from fastapi import APIRouter
from .sites import router as sites_router
from .devices import router as devices_router
from .telemetry import router as telemetry_router
from .alarms import router as alarms_router
from .stats import router as stats_router
from .settings import router as settings_router
from .analysis import router as analysis_router
from .market_price import router as market_price_router
from .coops import router as coops_router
from .flocks import router as flocks_router
from .integrations import router as integrations_router
from .chickin_adapter import router as chickin_adapter_router

api_router = APIRouter()

api_router.include_router(sites_router)
api_router.include_router(devices_router)
api_router.include_router(telemetry_router)
api_router.include_router(alarms_router)
api_router.include_router(stats_router)
api_router.include_router(settings_router)
api_router.include_router(analysis_router)
api_router.include_router(market_price_router)
api_router.include_router(coops_router)
api_router.include_router(flocks_router)
api_router.include_router(integrations_router)
api_router.include_router(chickin_adapter_router)
