"""
Devices API endpoints.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.redis import redis_manager
from app.models import Device, Site, Command
from app.schemas import (
    DeviceCreate, DeviceUpdate, DeviceResponse, DeviceDetail,
    CommandCreate, CommandResponse
)
from app.services.mqtt_service import mqtt_service

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=list[DeviceResponse])
async def list_devices(
    site_id: str | None = None,
    type: str | None = None,
    status: str | None = None,
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """List devices with filters."""
    query = select(Device)
    
    if site_id:
        query = query.where(Device.site_id == site_id)
    if type:
        query = query.where(Device.type == type)
    if status:
        query = query.where(Device.status == status)
    if search:
        query = query.where(
            or_(
                Device.name.ilike(f"%{search}%"),
                Device.device_key.ilike(f"%{search}%")
            )
        )
    
    query = query.order_by(Device.name).offset(skip).limit(limit)
    result = await db.execute(query)
    devices = result.scalars().all()
    
    # Update status from Redis for real-time accuracy
    for device in devices:
        device.status = await redis_manager.get_device_status(device.id)
    
    return devices


@router.get("/types")
async def get_device_types(db: AsyncSession = Depends(get_db)):
    """Get distinct device types with counts."""
    query = select(Device.type, func.count(Device.id)).group_by(Device.type)
    result = await db.execute(query)
    return [{"type": row[0], "count": row[1]} for row in result]


@router.get("/{device_id}", response_model=DeviceDetail)
async def get_device(device_id: str, db: AsyncSession = Depends(get_db)):
    """Get device details with shadow state."""
    result = await db.execute(
        select(Device).where(Device.id == device_id).options()
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Get real-time status
    device.status = await redis_manager.get_device_status(device.id)
    
    # Load site if exists
    if device.site_id:
        site_result = await db.execute(select(Site).where(Site.id == device.site_id))
        device.site = site_result.scalar_one_or_none()
    
    return device


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_device(device_data: DeviceCreate, db: AsyncSession = Depends(get_db)):
    """Register a new device."""
    # Check for duplicate device_key
    existing = await db.execute(
        select(Device).where(Device.device_key == device_data.device_key)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Device key already exists")
    
    device = Device(**device_data.model_dump())
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: str, 
    device_data: DeviceUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update device info or shadow desired state."""
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = device_data.model_dump(exclude_unset=True)
    
    # If updating shadow_desired, publish to MQTT
    if "shadow_desired" in update_data and device.site_id:
        await mqtt_service.publish_shadow_desired(
            device.site_id, device.id, update_data["shadow_desired"]
        )
    
    for key, value in update_data.items():
        setattr(device, key, value)
    
    device.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=204)
async def delete_device(device_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a device."""
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    await db.delete(device)


@router.post("/{device_id}/commands", response_model=CommandResponse, status_code=201)
async def send_command(
    device_id: str,
    command_data: CommandCreate,
    db: AsyncSession = Depends(get_db)
):
    """Send command to device."""
    # Verify device exists
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if not device.site_id:
        raise HTTPException(status_code=400, detail="Device has no site assigned")
    
    # Create command record
    command = Command(
        device_id=device_id,
        command_type=command_data.command_type,
        payload=command_data.payload,
        status="sent"
    )
    db.add(command)
    await db.flush()
    await db.refresh(command)
    
    # Publish to MQTT
    mqtt_payload = {
        "command_id": command.id,
        "type": command.command_type,
        "payload": command.payload
    }
    await mqtt_service.publish_command(device.site_id, device.id, mqtt_payload)
    
    return command


@router.get("/{device_id}/commands", response_model=list[CommandResponse])
async def get_device_commands(
    device_id: str,
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Get command history for a device."""
    query = select(Command).where(Command.device_id == device_id)
    
    if status:
        query = query.where(Command.status == status)
    
    query = query.order_by(Command.ts_sent.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
