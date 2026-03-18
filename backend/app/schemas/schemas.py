"""
Pydantic schemas for request/response validation.
Includes the original IoT-generic API plus farm-domain support schemas.
"""
from datetime import datetime, date
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
    meta_data: dict = Field(default_factory=dict)


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    site_id: Optional[str] = None
    firmware: Optional[str] = None
    meta_data: Optional[dict] = None
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
    meta_data: dict = {}
    site: Optional[SiteResponse] = None


# ============== Farm Domain Schemas ==============
class FlockSnapshotSchema(BaseModel):
    value: Optional[float] = None
    calibration: Optional[float] = None


class CoopBase(BaseModel):
    external_id: Optional[str] = None
    site_id: Optional[str] = None
    code: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    coop_type: int = 1
    population: int = 0
    cultivation_type: str = "broiler"
    province: Optional[str] = None
    regency: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    floor_count: int = 1
    active: bool = True
    fully_paired: bool = False
    is_mandiri: bool = True
    is_distributor: bool = False
    created_by: Optional[str] = None
    meta_data: dict = Field(default_factory=dict)


class CoopCreate(CoopBase):
    pass


class CoopUpdate(BaseModel):
    external_id: Optional[str] = None
    site_id: Optional[str] = None
    code: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    coop_type: Optional[int] = None
    population: Optional[int] = None
    cultivation_type: Optional[str] = None
    province: Optional[str] = None
    regency: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    floor_count: Optional[int] = None
    active: Optional[bool] = None
    fully_paired: Optional[bool] = None
    is_mandiri: Optional[bool] = None
    is_distributor: Optional[bool] = None
    created_by: Optional[str] = None
    meta_data: Optional[dict] = None


class CoopResponse(CoopBase):
    id: str
    created_at: datetime
    updated_at: datetime
    flock_count: int = 0
    online_flocks: int = 0

    class Config:
        from_attributes = True


class FlockBase(BaseModel):
    external_id: Optional[str] = None
    coop_id: str
    floor_index: int = 0
    name: str = Field(..., min_length=1, max_length=100)
    part_number: Optional[str] = None
    device_name: Optional[str] = None
    type: str = "Ci-Touch"
    type_code: Optional[int] = None
    version: Optional[str] = None
    version_code: Optional[int] = None
    mode: Optional[str] = None
    day: int = 0
    population: int = 0
    connected: bool = False
    is_pairing: bool = False
    enabled: bool = True
    deleted: bool = False
    last_update: Optional[datetime] = None
    actual_temperature: Optional[float] = None
    ideal_temperature: Optional[float] = None
    humidity: Optional[float] = None
    hsi: Optional[float] = None
    co2: Optional[float] = None
    ammonia: Optional[float] = None
    water: Optional[float] = None
    wind: Optional[float] = None
    lux: Optional[float] = None
    device_state: dict = Field(default_factory=dict)
    target_temperature: dict = Field(default_factory=dict)
    sensors: dict = Field(default_factory=dict)
    alarm_config: dict = Field(default_factory=dict)
    inverter: dict = Field(default_factory=dict)
    features: dict = Field(default_factory=dict)
    last_connected: dict = Field(default_factory=dict)
    meta_data: dict = Field(default_factory=dict)


class FlockCreate(FlockBase):
    pass


class FlockUpdate(BaseModel):
    external_id: Optional[str] = None
    floor_index: Optional[int] = None
    name: Optional[str] = None
    part_number: Optional[str] = None
    device_name: Optional[str] = None
    type: Optional[str] = None
    type_code: Optional[int] = None
    version: Optional[str] = None
    version_code: Optional[int] = None
    mode: Optional[str] = None
    day: Optional[int] = None
    population: Optional[int] = None
    connected: Optional[bool] = None
    is_pairing: Optional[bool] = None
    enabled: Optional[bool] = None
    deleted: Optional[bool] = None
    last_update: Optional[datetime] = None
    actual_temperature: Optional[float] = None
    ideal_temperature: Optional[float] = None
    humidity: Optional[float] = None
    hsi: Optional[float] = None
    co2: Optional[float] = None
    ammonia: Optional[float] = None
    water: Optional[float] = None
    wind: Optional[float] = None
    lux: Optional[float] = None
    device_state: Optional[dict] = None
    target_temperature: Optional[dict] = None
    sensors: Optional[dict] = None
    alarm_config: Optional[dict] = None
    inverter: Optional[dict] = None
    features: Optional[dict] = None
    last_connected: Optional[dict] = None
    meta_data: Optional[dict] = None


class FlockResponse(FlockBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DailyMetricBase(BaseModel):
    flock_id: str
    metric_date: date
    age_day: int = 0
    population_initial: int = 0
    population_current: int = 0
    mortality: int = 0
    body_weight: Optional[float] = None
    target_weight: Optional[float] = None
    feed_consumption: Optional[float] = None
    water_consumption: Optional[float] = None
    fcr: Optional[float] = None
    livability: Optional[float] = None
    performance_index: Optional[float] = None
    climate_score: Optional[float] = None
    control_score: Optional[float] = None
    ipc: Optional[float] = None
    notes: Optional[str] = None


class DailyMetricCreate(DailyMetricBase):
    pass


class DailyMetricResponse(DailyMetricBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class MaintenanceLogBase(BaseModel):
    flock_id: Optional[str] = None
    device_id: Optional[str] = None
    maintenance_date: Optional[datetime] = None
    technician_name: str = Field(..., min_length=1, max_length=100)
    activity: str = Field(..., min_length=1)
    problem_to_solve: Optional[str] = None
    status: str = Field(default="pending", pattern="^(pending|in_progress|done)$")
    photo_before_url: Optional[str] = None
    photo_after_url: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceLogCreate(MaintenanceLogBase):
    pass


class MaintenanceLogResponse(MaintenanceLogBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class FlockDetail(FlockResponse):
    daily_metrics: list[DailyMetricResponse] = []
    maintenance_logs: list[MaintenanceLogResponse] = []


class CoopDetail(CoopResponse):
    flocks: list[FlockResponse] = []


class ExternalEndpointBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    service_type: str = Field(..., min_length=1, max_length=50)
    source: str = Field(default="external", pattern="^(external|internal)$")
    base_url: Optional[str] = None
    ws_url: Optional[str] = None
    auth_type: Optional[str] = None
    username: Optional[str] = None
    headers_template: dict = Field(default_factory=dict)
    is_active: bool = True
    notes: Optional[str] = None


class ExternalEndpointCreate(ExternalEndpointBase):
    pass


class ExternalEndpointUpdate(BaseModel):
    name: Optional[str] = None
    service_type: Optional[str] = None
    source: Optional[str] = None
    base_url: Optional[str] = None
    ws_url: Optional[str] = None
    auth_type: Optional[str] = None
    username: Optional[str] = None
    headers_template: Optional[dict] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ExternalEndpointResponse(ExternalEndpointBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Market Search Schemas ==============
class MarketSearchResponse(BaseModel):
    id: str
    query: str
    category: str
    summary: Optional[str] = None
    items: list = []
    sources: list = []
    searched_at: datetime

    class Config:
        from_attributes = True


# ============== Analysis Session Schemas ==============
class AnalysisSessionCreate(BaseModel):
    title: Optional[str] = None
    role_id: Optional[str] = None


class AnalysisSessionResponse(BaseModel):
    id: str
    title: Optional[str] = None
    role_id: Optional[str] = None
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    meta_data: dict = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnalysisMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sql: Optional[str] = None
    data: Optional[Any] = None
    chart_config: Optional[dict] = None
    ai_role_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisSessionDetail(AnalysisSessionResponse):
    messages: list[AnalysisMessageResponse] = []


# ============== Chickin Integration Schemas ==============
class ChickinLoginRequest(BaseModel):
    identifier: str = Field(..., min_length=1, description="Email, username, or phone")
    password: str = Field(..., min_length=1)
    method: str = Field(default="Email", pattern="^(Email|Username|Phone)$")


class ChickinLoginResponse(BaseModel):
    token: Optional[str] = None
    message: str
    user: Optional[dict] = None
    errors: Optional[list] = None


class ChickinCoopResponse(BaseModel):
    """Normalized coop response from Chickin adapter."""
    external_id: str
    code: str
    name: str
    address: Optional[str] = None
    coop_type: int = 1
    population: int = 0
    cultivation_type: str = "broiler"
    province: Optional[str] = None
    regency: Optional[str] = None
    city: Optional[str] = None
    floor_count: int = 1
    flock_count: int = 0
    active: bool = True
    fully_paired: bool = False
    is_mandiri: bool = True
    is_distributor: bool = False
    flocks: list = []


class ChickinFlockResponse(BaseModel):
    """Normalized flock response from Chickin adapter."""
    external_id: str
    name: str
    part_number: Optional[str] = None
    device_name: Optional[str] = None
    type: str = "Ci-Touch"
    type_code: Optional[int] = None
    version: Optional[str] = None
    version_code: Optional[int] = None
    mode: Optional[str] = None
    day: int = 0
    population: int = 0
    connected: bool = False
    actual_temperature: Optional[float] = None
    ideal_temperature: Optional[float] = None
    humidity: Optional[float] = None
    hsi: Optional[float] = None
    co2: Optional[float] = None
    ammonia: Optional[float] = None
    device_state: dict = {}
    target_temperature: dict = {}
    sensors: dict = {}
    alarm_config: dict = {}
    inverter: dict = {}
    features: dict = {}
    coop: Optional[dict] = None


class IntegrationErrorResponse(BaseModel):
    """Standardized error response from integration layer."""
    error: str
    detail: Optional[str] = None
    upstream_status: Optional[int] = None
    source: str = "chickin"


# ============== Telemetry Schemas ==============
class TelemetryPoint(BaseModel):
    time: datetime
    metric: str
    value: float


class TelemetryCreate(BaseModel):
    device_id: str
    metrics: dict[str, float]
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
    message_rate: int
    total_sites: int


class DeviceTypeCount(BaseModel):
    type: str
    count: int


# ============== WebSocket Event Schemas ==============
class WSEvent(BaseModel):
    type: str
    payload: Any


class TelemetryEvent(BaseModel):
    device_id: str
    metrics: dict[str, float]
    timestamp: datetime


class StatusEvent(BaseModel):
    device_id: str
    status: str
    last_seen: datetime


class AlarmEvent(BaseModel):
    id: str
    device_id: str
    severity: str
    message: str
    timestamp: datetime


SiteWithDevices.model_rebuild()
DeviceDetail.model_rebuild()
CoopDetail.model_rebuild()
FlockDetail.model_rebuild()
