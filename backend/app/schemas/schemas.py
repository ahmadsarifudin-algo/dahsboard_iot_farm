"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


# ============== Site Schemas ==============
class SiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    region: Optional[str] = None
    address: Optional[str] = None


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    region: Optional[str] = None
    address: Optional[str] = None


class SiteResponse(SiteBase):
    id: str
    created_at: datetime
    device_count: int = 0
    
    class Config:
        from_attributes = True


class SiteWithDevices(SiteResponse):
    devices: list["DeviceResponse"] = []


# ============== Device Schemas ==============
class DeviceBase(BaseModel):
    device_key: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., min_length=1, max_length=50)
    site_id: Optional[str] = None
    firmware: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    site_id: Optional[str] = None
    firmware: Optional[str] = None
    metadata: Optional[dict] = None
    shadow_desired: Optional[dict] = None


class DeviceResponse(BaseModel):
    id: str
    device_key: str
    name: str
    type: str
    site_id: Optional[str]
    firmware: Optional[str]
    status: str
    last_seen: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeviceDetail(DeviceResponse):
    shadow_desired: dict = {}
    shadow_reported: dict = {}
    metadata: dict = {}
    site: Optional[SiteResponse] = None


# ============== Telemetry Schemas ==============
class TelemetryPoint(BaseModel):
    time: datetime
    metric: str
    value: float


class TelemetryCreate(BaseModel):
    device_id: str
    metrics: dict[str, float]  # {metric_name: value}
    timestamp: Optional[datetime] = None


class TelemetryResponse(BaseModel):
    device_id: str
    data: list[TelemetryPoint]
    
    
class TelemetryAggregated(BaseModel):
    time: datetime
    min: float
    max: float
    avg: float
    count: int


# ============== Alarm Schemas ==============
class AlarmBase(BaseModel):
    device_id: str
    severity: str = Field(..., pattern="^(critical|warning|info)$")
    message: str


class AlarmCreate(AlarmBase):
    pass


class AlarmResponse(AlarmBase):
    id: str
    ts_open: datetime
    ts_close: Optional[datetime]
    acknowledged: bool
    acknowledged_by: Optional[str]
    device: Optional[DeviceResponse] = None
    
    class Config:
        from_attributes = True


class AlarmAcknowledge(BaseModel):
    acknowledged_by: str


# ============== Command Schemas ==============
class CommandBase(BaseModel):
    command_type: str
    payload: dict


class CommandCreate(CommandBase):
    device_id: str


class CommandResponse(BaseModel):
    id: str
    device_id: str
    command_type: str
    payload: dict
    status: str
    ts_sent: datetime
    ts_ack: Optional[datetime]
    response: Optional[dict]
    
    class Config:
        from_attributes = True


# ============== Stats/Overview Schemas ==============
class OverviewStats(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    active_alarms: int
    critical_alarms: int
    warning_alarms: int
    message_rate: int  # per minute
    total_sites: int


class DeviceTypeCount(BaseModel):
    type: str
    count: int


# ============== WebSocket Event Schemas ==============
class WSEvent(BaseModel):
    type: str  # telemetry, status, alarm, command_ack, stats
    payload: Any


class TelemetryEvent(BaseModel):
    device_id: str
    metrics: dict[str, float]
    timestamp: datetime


class StatusEvent(BaseModel):
    device_id: str
    status: str  # online, offline
    last_seen: datetime


class AlarmEvent(BaseModel):
    id: str
    device_id: str
    severity: str
    message: str
    timestamp: datetime


# Forward references
SiteWithDevices.model_rebuild()
DeviceDetail.model_rebuild()
