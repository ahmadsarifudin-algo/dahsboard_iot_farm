"""
Chickin integration adapter endpoints.
These proxy/normalize calls to Chickin external services so that
the frontend only talks to the local backend.

Routes:
  POST /integrations/chickin/auth/login
  POST /integrations/chickin/auth/logout
  GET  /integrations/chickin/auth/me
  GET  /integrations/chickin/coops
  GET  /integrations/chickin/flocks/{flock_id}
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models import Coop, Flock
from app.schemas import (
    ChickinLoginRequest,
    ChickinLoginResponse,
    ChickinCoopResponse,
    ChickinFlockResponse,
)
from app.services.chickin_client import chickin_client, ChickinUpstreamError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/chickin", tags=["Chickin Adapter"])


def _extract_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract Bearer token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.split(" ", 1)[1]


# ---- Auth Adapter Endpoints ----

@router.post("/auth/login", response_model=ChickinLoginResponse)
async def chickin_login(body: ChickinLoginRequest):
    """
    Proxy login to Chickin auth service.
    Frontend sends credentials here instead of directly to auth.chickinindonesia.com.
    """
    try:
        result = await chickin_client.login(body.identifier, body.password, body.method)
        return ChickinLoginResponse(
            token=result.get("token"),
            message=result.get("message", "OK"),
            user=result.get("user"),
            errors=result.get("errors"),
        )
    except ChickinUpstreamError as exc:
        raise HTTPException(
            status_code=exc.status_code if exc.status_code < 500 else 502,
            detail=exc.detail,
        )


@router.post("/auth/logout")
async def chickin_logout(authorization: Optional[str] = Header(None)):
    """Proxy logout to Chickin auth service."""
    token = _extract_token(authorization)
    try:
        result = await chickin_client.logout(token)
        return result
    except ChickinUpstreamError as exc:
        raise HTTPException(status_code=502, detail=exc.detail)


@router.get("/auth/me")
async def chickin_me(authorization: Optional[str] = Header(None)):
    """Fetch current user profile via Chickin auth adapter."""
    token = _extract_token(authorization)
    try:
        user_data = await chickin_client.get_me(token)
        return {"data": user_data}
    except ChickinUpstreamError as exc:
        raise HTTPException(
            status_code=exc.status_code if exc.status_code < 500 else 502,
            detail=exc.detail,
        )


# ---- Coop/Kandang Adapter Endpoints ----

@router.get("/coops", response_model=list[ChickinCoopResponse])
async def chickin_list_coops(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch kandang list from Chickin, normalize, and snapshot to local DB.
    Frontend calls this instead of prod-iot.chickinindonesia.com directly.
    """
    token = _extract_token(authorization)
    try:
        coops = await chickin_client.get_coops(token)
    except ChickinUpstreamError as exc:
        raise HTTPException(
            status_code=exc.status_code if exc.status_code < 500 else 502,
            detail=exc.detail,
        )

    # Snapshot upsert to local DB
    for coop_data in coops:
        ext_id = coop_data["external_id"]
        result = await db.execute(select(Coop).where(Coop.external_id == ext_id))
        existing = result.scalar_one_or_none()

        if existing:
            for key in ("code", "name", "address", "coop_type", "population",
                        "cultivation_type", "province", "regency", "city",
                        "floor_count", "active", "fully_paired", "is_mandiri", "is_distributor"):
                setattr(existing, key, coop_data.get(key, getattr(existing, key)))
        else:
            new_coop = Coop(
                external_id=ext_id,
                code=coop_data.get("code", ext_id[:20]),
                name=coop_data.get("name", ext_id[:20]),
                address=coop_data.get("address"),
                coop_type=coop_data.get("coop_type", 1),
                population=coop_data.get("population", 0),
                cultivation_type=coop_data.get("cultivation_type", "broiler"),
                province=coop_data.get("province"),
                regency=coop_data.get("regency"),
                city=coop_data.get("city"),
                floor_count=coop_data.get("floor_count", 1),
                active=coop_data.get("active", True),
                fully_paired=coop_data.get("fully_paired", False),
                is_mandiri=coop_data.get("is_mandiri", True),
                is_distributor=coop_data.get("is_distributor", False),
            )
            db.add(new_coop)

    await db.flush()
    return coops


# ---- Flock Adapter Endpoints ----

@router.get("/flocks/{flock_id}", response_model=ChickinFlockResponse)
async def chickin_get_flock(
    flock_id: str,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch single flock detail from Chickin, normalize, and snapshot.
    Frontend calls this instead of prod-iot.chickinindonesia.com directly.
    """
    token = _extract_token(authorization)
    try:
        flock_data = await chickin_client.get_flock(flock_id, token)
    except ChickinUpstreamError as exc:
        raise HTTPException(
            status_code=exc.status_code if exc.status_code < 500 else 502,
            detail=exc.detail,
        )

    # Snapshot upsert to local DB
    ext_id = flock_data["external_id"]
    result = await db.execute(select(Flock).where(Flock.external_id == ext_id))
    existing = result.scalar_one_or_none()

    if existing:
        for key in ("name", "part_number", "device_name", "type", "type_code",
                     "version", "version_code", "mode", "day", "population",
                     "connected", "actual_temperature", "ideal_temperature",
                     "humidity", "hsi", "co2", "ammonia",
                     "device_state", "target_temperature", "sensors",
                     "alarm_config", "inverter", "features"):
            val = flock_data.get(key)
            if val is not None:
                setattr(existing, key, val)
    else:
        # Need a coop_id — look up by coop external_id or create placeholder
        coop_ext = flock_data.get("coop", {})
        coop_id = None
        if coop_ext and coop_ext.get("external_id"):
            coop_result = await db.execute(
                select(Coop).where(Coop.external_id == coop_ext["external_id"])
            )
            coop_obj = coop_result.scalar_one_or_none()
            if coop_obj:
                coop_id = coop_obj.id

        if coop_id:
            new_flock = Flock(
                external_id=ext_id,
                coop_id=coop_id,
                name=flock_data.get("name", ""),
                part_number=flock_data.get("part_number"),
                device_name=flock_data.get("device_name"),
                type=flock_data.get("type", "Ci-Touch"),
                type_code=flock_data.get("type_code"),
                version=flock_data.get("version"),
                version_code=flock_data.get("version_code"),
                mode=flock_data.get("mode"),
                day=flock_data.get("day", 0),
                population=flock_data.get("population", 0),
                connected=flock_data.get("connected", False),
                actual_temperature=flock_data.get("actual_temperature"),
                ideal_temperature=flock_data.get("ideal_temperature"),
                humidity=flock_data.get("humidity"),
                hsi=flock_data.get("hsi"),
                co2=flock_data.get("co2"),
                ammonia=flock_data.get("ammonia"),
                device_state=flock_data.get("device_state", {}),
                target_temperature=flock_data.get("target_temperature", {}),
                sensors=flock_data.get("sensors", {}),
                alarm_config=flock_data.get("alarm_config", {}),
                inverter=flock_data.get("inverter", {}),
                features=flock_data.get("features", {}),
            )
            db.add(new_flock)

    await db.flush()
    return flock_data
