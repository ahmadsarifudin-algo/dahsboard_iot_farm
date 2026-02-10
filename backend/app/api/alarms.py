"""
Alarms API endpoints.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Alarm, Device
from app.schemas import AlarmCreate, AlarmResponse, AlarmAcknowledge

router = APIRouter(prefix="/alarms", tags=["Alarms"])


@router.get("", response_model=list[AlarmResponse])
async def list_alarms(
    device_id: str | None = None,
    severity: str | None = None,
    active_only: bool = True,
    acknowledged: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """List alarms with filters."""
    query = select(Alarm).options(selectinload(Alarm.device))
    
    conditions = []
    if device_id:
        conditions.append(Alarm.device_id == device_id)
    if severity:
        conditions.append(Alarm.severity == severity)
    if active_only:
        conditions.append(Alarm.ts_close.is_(None))
    if acknowledged is not None:
        conditions.append(Alarm.acknowledged == acknowledged)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(Alarm.ts_open.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/summary")
async def get_alarm_summary(db: AsyncSession = Depends(get_db)):
    """Get alarm counts by severity."""
    query = select(
        Alarm.severity,
        func.count(Alarm.id).label("count")
    ).where(
        Alarm.ts_close.is_(None)
    ).group_by(Alarm.severity)
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    summary = {"critical": 0, "warning": 0, "info": 0, "total": 0}
    for row in rows:
        summary[row.severity] = row.count
        summary["total"] += row.count
    
    return summary


@router.get("/{alarm_id}", response_model=AlarmResponse)
async def get_alarm(alarm_id: str, db: AsyncSession = Depends(get_db)):
    """Get alarm details."""
    result = await db.execute(
        select(Alarm).options(selectinload(Alarm.device)).where(Alarm.id == alarm_id)
    )
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    return alarm


@router.post("", response_model=AlarmResponse, status_code=201)
async def create_alarm(alarm_data: AlarmCreate, db: AsyncSession = Depends(get_db)):
    """Create a new alarm."""
    # Verify device exists
    result = await db.execute(select(Device.id).where(Device.id == alarm_data.device_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")
    
    alarm = Alarm(**alarm_data.model_dump())
    db.add(alarm)
    await db.flush()
    await db.refresh(alarm)
    return alarm


@router.patch("/{alarm_id}/acknowledge", response_model=AlarmResponse)
async def acknowledge_alarm(
    alarm_id: str,
    ack_data: AlarmAcknowledge,
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge an alarm."""
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    alarm.acknowledged = True
    alarm.acknowledged_by = ack_data.acknowledged_by
    
    await db.flush()
    await db.refresh(alarm)
    return alarm


@router.patch("/{alarm_id}/close", response_model=AlarmResponse)
async def close_alarm(alarm_id: str, db: AsyncSession = Depends(get_db)):
    """Close/resolve an alarm."""
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    if alarm.ts_close:
        raise HTTPException(status_code=400, detail="Alarm already closed")
    
    alarm.ts_close = datetime.utcnow()
    
    await db.flush()
    await db.refresh(alarm)
    return alarm


@router.delete("/{alarm_id}", status_code=204)
async def delete_alarm(alarm_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an alarm."""
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    await db.delete(alarm)
