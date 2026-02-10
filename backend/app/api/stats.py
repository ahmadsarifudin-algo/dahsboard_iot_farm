"""
Stats/Overview API endpoints for dashboard KPIs.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.redis import redis_manager
from app.models import Site, Device, Alarm
from app.schemas import OverviewStats

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/overview", response_model=OverviewStats)
async def get_overview_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard overview statistics."""
    
    # Total sites
    sites_result = await db.execute(select(func.count(Site.id)))
    total_sites = sites_result.scalar() or 0
    
    # Total devices
    devices_result = await db.execute(select(func.count(Device.id)))
    total_devices = devices_result.scalar() or 0
    
    # Online devices (from Redis)
    online_devices = await redis_manager.get_online_count()
    
    # Active alarms by severity
    alarms_query = select(
        Alarm.severity,
        func.count(Alarm.id)
    ).where(Alarm.ts_close.is_(None)).group_by(Alarm.severity)
    
    alarms_result = await db.execute(alarms_query)
    alarm_counts = {row[0]: row[1] for row in alarms_result.fetchall()}
    
    critical_alarms = alarm_counts.get("critical", 0)
    warning_alarms = alarm_counts.get("warning", 0)
    active_alarms = sum(alarm_counts.values())
    
    # Message rate (from Redis)
    message_rate = await redis_manager.get_message_rate()
    
    return OverviewStats(
        total_devices=total_devices,
        online_devices=online_devices,
        offline_devices=total_devices - online_devices,
        active_alarms=active_alarms,
        critical_alarms=critical_alarms,
        warning_alarms=warning_alarms,
        message_rate=message_rate,
        total_sites=total_sites
    )


@router.get("/devices/by-type")
async def get_devices_by_type(db: AsyncSession = Depends(get_db)):
    """Get device counts by type."""
    query = select(
        Device.type,
        func.count(Device.id).label("total"),
        func.count(Device.id).filter(Device.status == "online").label("online")
    ).group_by(Device.type)
    
    result = await db.execute(query)
    return [
        {"type": row.type, "total": row.total, "online": row.online}
        for row in result.fetchall()
    ]


@router.get("/devices/by-site")
async def get_devices_by_site(db: AsyncSession = Depends(get_db)):
    """Get device counts by site."""
    query = select(
        Site.id,
        Site.name,
        func.count(Device.id).label("total"),
        func.count(Device.id).filter(Device.status == "online").label("online")
    ).outerjoin(Device, Device.site_id == Site.id).group_by(Site.id, Site.name)
    
    result = await db.execute(query)
    return [
        {
            "site_id": row.id,
            "site_name": row.name,
            "total": row.total,
            "online": row.online
        }
        for row in result.fetchall()
    ]


@router.get("/alarms/timeline")
async def get_alarms_timeline(
    hours: int = 24,
    db: AsyncSession = Depends(get_db)
):
    """Get alarm counts over time for trend chart."""
    from datetime import datetime, timedelta
    from sqlalchemy import text
    
    start_time = datetime.utcnow() - timedelta(hours=hours)
    
    query = text("""
        SELECT 
            date_trunc('hour', ts_open) as hour,
            severity,
            COUNT(*) as count
        FROM alarms
        WHERE ts_open >= :start_time
        GROUP BY hour, severity
        ORDER BY hour
    """)
    
    result = await db.execute(query, {"start_time": start_time})
    rows = result.fetchall()
    
    timeline = {}
    for row in rows:
        hour_key = row.hour.isoformat()
        if hour_key not in timeline:
            timeline[hour_key] = {"critical": 0, "warning": 0, "info": 0}
        timeline[hour_key][row.severity] = row.count
    
    return [
        {"time": time, **counts}
        for time, counts in sorted(timeline.items())
    ]
