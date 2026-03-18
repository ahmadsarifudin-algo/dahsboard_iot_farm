"""
Coops/Kandang API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Coop
from app.schemas import CoopCreate, CoopUpdate, CoopResponse, CoopDetail

router = APIRouter(prefix="/coops", tags=["Coops"])


def _coop_to_response(coop: Coop) -> CoopResponse:
    response = CoopResponse.model_validate(coop)
    response.flock_count = len(coop.flocks)
    response.online_flocks = len([flock for flock in coop.flocks if flock.connected and not flock.deleted])
    return response


@router.get("", response_model=list[CoopResponse])
async def list_coops(
    province: str | None = None,
    regency: str | None = None,
    active: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """List kandang/coops with optional filters."""
    query = select(Coop).options(selectinload(Coop.flocks)).order_by(Coop.name)

    if province:
        query = query.where(Coop.province == province)
    if regency:
        query = query.where(Coop.regency == regency)
    if active is not None:
        query = query.where(Coop.active == active)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    coops = result.scalars().all()
    return [_coop_to_response(coop) for coop in coops]


@router.get("/{coop_id}", response_model=CoopDetail)
async def get_coop(coop_id: str, db: AsyncSession = Depends(get_db)):
    """Get kandang detail with flock data."""
    result = await db.execute(
        select(Coop)
        .options(selectinload(Coop.flocks))
        .where(Coop.id == coop_id)
    )
    coop = result.scalar_one_or_none()

    if not coop:
        raise HTTPException(status_code=404, detail="Coop not found")

    response = CoopDetail.model_validate(coop)
    response.flock_count = len(coop.flocks)
    response.online_flocks = len([flock for flock in coop.flocks if flock.connected and not flock.deleted])
    return response


@router.post("", response_model=CoopResponse, status_code=201)
async def create_coop(body: CoopCreate, db: AsyncSession = Depends(get_db)):
    """Create a new kandang/coop."""
    existing = await db.execute(select(Coop).where(Coop.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Coop code already exists")

    coop = Coop(**body.model_dump())
    db.add(coop)
    await db.flush()
    await db.refresh(coop)
    return _coop_to_response(coop)


@router.patch("/{coop_id}", response_model=CoopResponse)
async def update_coop(coop_id: str, body: CoopUpdate, db: AsyncSession = Depends(get_db)):
    """Update kandang/coop metadata."""
    result = await db.execute(
        select(Coop)
        .options(selectinload(Coop.flocks))
        .where(Coop.id == coop_id)
    )
    coop = result.scalar_one_or_none()

    if not coop:
        raise HTTPException(status_code=404, detail="Coop not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(coop, key, value)

    await db.flush()
    await db.refresh(coop)
    return _coop_to_response(coop)


@router.delete("/{coop_id}", status_code=204)
async def delete_coop(coop_id: str, db: AsyncSession = Depends(get_db)):
    """Delete kandang/coop."""
    result = await db.execute(select(Coop).where(Coop.id == coop_id))
    coop = result.scalar_one_or_none()

    if not coop:
        raise HTTPException(status_code=404, detail="Coop not found")

    await db.delete(coop)


@router.get("/map/data")
async def get_coops_map_data(db: AsyncSession = Depends(get_db)):
    """Get kandang map data with farm-specific summary."""
    result = await db.execute(
        select(Coop).options(selectinload(Coop.flocks)).order_by(Coop.name)
    )
    coops = result.scalars().all()

    payload = []
    for coop in coops:
        flocks = [flock for flock in coop.flocks if not flock.deleted]
        temps = [flock.actual_temperature for flock in flocks if flock.actual_temperature is not None]
        humis = [flock.humidity for flock in flocks if flock.humidity is not None]
        amonias = [flock.ammonia for flock in flocks if flock.ammonia is not None]

        alarm_messages: list[str] = []
        if any((temp or 0) >= 32 for temp in temps):
            alarm_messages.append("Suhu kritis pada salah satu flock")
        elif any((temp or 0) >= 30 for temp in temps):
            alarm_messages.append("Suhu tinggi pada salah satu flock")

        if any((ammonia or 0) >= 20 for ammonia in amonias):
            alarm_messages.append("Amonia kritis")
        elif any((ammonia or 0) >= 12 for ammonia in amonias):
            alarm_messages.append("Amonia tinggi")

        if any(not flock.connected for flock in flocks):
            alarm_messages.append("Ada flock/device offline")

        alarm_status = "normal"
        if any(msg in alarm_messages for msg in ["Suhu kritis pada salah satu flock", "Amonia kritis"]):
            alarm_status = "critical"
        elif alarm_messages:
            alarm_status = "warning"

        payload.append({
            "id": coop.id,
            "code": coop.code,
            "name": coop.name,
            "address": coop.address,
            "region": coop.province or coop.regency or coop.city,
            "lat": coop.latitude,
            "lng": coop.longitude,
            "population": coop.population,
            "floor_count": coop.floor_count,
            "flock_count": len(flocks),
            "temperature_avg": round(sum(temps) / len(temps), 2) if temps else None,
            "humidity_avg": round(sum(humis) / len(humis), 2) if humis else None,
            "ammonia_avg": round(sum(amonias) / len(amonias), 2) if amonias else None,
            "online_flocks": len([flock for flock in flocks if flock.connected]),
            "alarm_status": alarm_status,
            "alarm_count": len(alarm_messages),
            "alarm_messages": alarm_messages,
        })

    return payload
