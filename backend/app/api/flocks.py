"""
Flocks, daily metrics, and maintenance APIs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Coop, Flock, DailyMetric, MaintenanceLog
from app.schemas import (
    FlockCreate,
    FlockUpdate,
    FlockResponse,
    FlockDetail,
    DailyMetricCreate,
    DailyMetricResponse,
    MaintenanceLogCreate,
    MaintenanceLogResponse,
)

router = APIRouter(prefix="/flocks", tags=["Flocks"])


@router.get("", response_model=list[FlockResponse])
async def list_flocks(
    coop_id: str | None = None,
    connected: bool | None = None,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """List flocks with optional coop and connection filters."""
    query = select(Flock).order_by(Flock.name).limit(limit)

    if coop_id:
        query = query.where(Flock.coop_id == coop_id)
    if connected is not None:
        query = query.where(Flock.connected == connected)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{flock_id}", response_model=FlockDetail)
async def get_flock(flock_id: str, db: AsyncSession = Depends(get_db)):
    """Get flock detail with daily metrics and maintenance logs."""
    result = await db.execute(
        select(Flock)
        .options(
            selectinload(Flock.daily_metrics),
            selectinload(Flock.maintenance_logs),
        )
        .where(Flock.id == flock_id)
    )
    flock = result.scalar_one_or_none()

    if not flock:
        raise HTTPException(status_code=404, detail="Flock not found")

    return flock


@router.post("", response_model=FlockResponse, status_code=201)
async def create_flock(body: FlockCreate, db: AsyncSession = Depends(get_db)):
    """Create a new flock under a coop."""
    coop = await db.execute(select(Coop.id).where(Coop.id == body.coop_id))
    if not coop.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Coop not found")

    flock = Flock(**body.model_dump())
    db.add(flock)
    await db.flush()
    await db.refresh(flock)
    return flock


@router.patch("/{flock_id}", response_model=FlockResponse)
async def update_flock(flock_id: str, body: FlockUpdate, db: AsyncSession = Depends(get_db)):
    """Update flock state or metadata."""
    result = await db.execute(select(Flock).where(Flock.id == flock_id))
    flock = result.scalar_one_or_none()

    if not flock:
        raise HTTPException(status_code=404, detail="Flock not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(flock, key, value)

    await db.flush()
    await db.refresh(flock)
    return flock


@router.get("/{flock_id}/daily-metrics", response_model=list[DailyMetricResponse])
async def list_daily_metrics(
    flock_id: str,
    limit: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """List daily production metrics for a flock."""
    query = (
        select(DailyMetric)
        .where(DailyMetric.flock_id == flock_id)
        .order_by(DailyMetric.metric_date.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{flock_id}/daily-metrics", response_model=DailyMetricResponse, status_code=201)
async def create_daily_metric(
    flock_id: str,
    body: DailyMetricCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create or update a daily metric entry for a flock."""
    flock = await db.execute(select(Flock.id).where(Flock.id == flock_id))
    if not flock.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Flock not found")

    existing = await db.execute(
        select(DailyMetric).where(
            DailyMetric.flock_id == flock_id,
            DailyMetric.metric_date == body.metric_date,
        )
    )
    metric = existing.scalar_one_or_none()

    if metric:
        for key, value in body.model_dump(exclude={"flock_id"}).items():
            setattr(metric, key, value)
    else:
        metric = DailyMetric(**body.model_dump(), flock_id=flock_id)
        db.add(metric)

    await db.flush()
    await db.refresh(metric)
    return metric


@router.get("/{flock_id}/maintenance-logs", response_model=list[MaintenanceLogResponse])
async def list_maintenance_logs(
    flock_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List maintenance logs for a flock."""
    query = (
        select(MaintenanceLog)
        .where(MaintenanceLog.flock_id == flock_id)
        .order_by(MaintenanceLog.maintenance_date.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{flock_id}/maintenance-logs", response_model=MaintenanceLogResponse, status_code=201)
async def create_maintenance_log(
    flock_id: str,
    body: MaintenanceLogCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a maintenance log for a flock."""
    flock = await db.execute(select(Flock.id).where(Flock.id == flock_id))
    if not flock.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Flock not found")

    log = MaintenanceLog(**body.model_dump(), flock_id=flock_id)
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log
