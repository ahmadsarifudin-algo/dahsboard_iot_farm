"""
Telemetry API endpoints.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models import Device, Telemetry
from app.schemas import TelemetryCreate, TelemetryResponse, TelemetryPoint

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.get("/devices/{device_id}")
async def get_device_telemetry(
    device_id: str,
    metric: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    interval: str = Query("1m", pattern="^(1m|5m|15m|1h|6h|1d)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get telemetry data for a device with time-bucket aggregation.
    
    Intervals: 1m, 5m, 15m, 1h, 6h, 1d
    """
    # Verify device exists
    result = await db.execute(select(Device.id).where(Device.id == device_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Default time range: last 24 hours
    if not end:
        end = datetime.utcnow()
    if not start:
        start = end - timedelta(hours=24)
    
    # Map interval to TimescaleDB bucket
    interval_map = {
        "1m": "1 minute",
        "5m": "5 minutes",
        "15m": "15 minutes",
        "1h": "1 hour",
        "6h": "6 hours",
        "1d": "1 day"
    }
    bucket = interval_map.get(interval, "5 minutes")
    
    # Build aggregation query (TimescaleDB time_bucket)
    query = text("""
        SELECT 
            time_bucket(:bucket, time) AS bucket_time,
            metric,
            AVG(value) as avg_value,
            MIN(value) as min_value,
            MAX(value) as max_value,
            COUNT(*) as count
        FROM telemetry
        WHERE device_id = :device_id
            AND time >= :start
            AND time <= :end
            AND (:metric IS NULL OR metric = :metric)
        GROUP BY bucket_time, metric
        ORDER BY bucket_time DESC
        LIMIT 1000
    """)
    
    result = await db.execute(
        query,
        {
            "bucket": bucket,
            "device_id": device_id,
            "start": start,
            "end": end,
            "metric": metric
        }
    )
    rows = result.fetchall()
    
    # Group by metric
    data: dict[str, list] = {}
    for row in rows:
        metric_name = row.metric
        if metric_name not in data:
            data[metric_name] = []
        
        data[metric_name].append({
            "time": row.bucket_time.isoformat(),
            "avg": round(row.avg_value, 4),
            "min": round(row.min_value, 4),
            "max": round(row.max_value, 4),
            "count": row.count
        })
    
    return {
        "device_id": device_id,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "interval": interval,
        "metrics": data
    }


@router.post("")
async def ingest_telemetry(
    data: TelemetryCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest telemetry data point(s) for a device.
    Used for HTTP ingestion (alternative to MQTT).
    """
    # Verify device exists
    result = await db.execute(select(Device.id).where(Device.id == data.device_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")
    
    timestamp = data.timestamp or datetime.utcnow()
    
    # Insert telemetry points
    for metric, value in data.metrics.items():
        telemetry = Telemetry(
            time=timestamp,
            device_id=data.device_id,
            metric=metric,
            value=value
        )
        db.add(telemetry)
    
    await db.flush()
    
    return {"status": "ok", "points": len(data.metrics)}


@router.get("/metrics")
async def get_available_metrics(
    device_id: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Get list of available metrics."""
    query = select(Telemetry.metric).distinct()
    
    if device_id:
        query = query.where(Telemetry.device_id == device_id)
    
    result = await db.execute(query)
    return [row[0] for row in result.fetchall()]


@router.get("/latest/{device_id}")
async def get_latest_telemetry(
    device_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get latest telemetry values for each metric of a device."""
    # Get distinct metrics for device
    metrics_query = select(Telemetry.metric).where(
        Telemetry.device_id == device_id
    ).distinct()
    metrics_result = await db.execute(metrics_query)
    metrics = [row[0] for row in metrics_result.fetchall()]
    
    latest = {}
    for metric in metrics:
        query = select(Telemetry).where(
            Telemetry.device_id == device_id,
            Telemetry.metric == metric
        ).order_by(Telemetry.time.desc()).limit(1)
        
        result = await db.execute(query)
        row = result.scalar_one_or_none()
        if row:
            latest[metric] = {
                "value": row.value,
                "time": row.time.isoformat()
            }
    
    return {
        "device_id": device_id,
        "latest": latest
    }
