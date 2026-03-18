"""
SQLAlchemy models for IoT Data Center Dashboard.
Extends the original IoT-generic schema with farm-domain entities that
support kandang/coop, flock, daily production metrics, maintenance logs,
and external integration registry.
"""
import json
from datetime import datetime, date
from uuid import uuid4
from sqlalchemy import (
    String,
    Float,
    ForeignKey,
    Text,
    Boolean,
    DateTime,
    Date,
    Integer,
    Index,
    UniqueConstraint,
    TypeDecorator,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import types
from app.core.database import Base


class JSONType(TypeDecorator):
    """Platform-independent JSON type. Uses TEXT for portability."""

    impl = types.Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None


class Site(Base):
    """Generic geo site/location model."""

    __tablename__ = "sites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="site", lazy="selectin")
    coops: Mapped[list["Coop"]] = relationship("Coop", back_populates="site", lazy="selectin")


class Device(Base):
    """IoT device model with generic telemetry and shadow state."""

    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    device_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    site_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("sites.id"))
    firmware: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="offline", index=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    shadow_desired: Mapped[dict] = mapped_column(JSONType, default=dict)
    shadow_reported: Mapped[dict] = mapped_column(JSONType, default=dict)
    meta_data: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    site: Mapped["Site"] = relationship("Site", back_populates="devices")
    alarms: Mapped[list["Alarm"]] = relationship("Alarm", back_populates="device", lazy="selectin")
    commands: Mapped[list["Command"]] = relationship("Command", back_populates="device", lazy="selectin")
    maintenance_logs: Mapped[list["MaintenanceLog"]] = relationship(
        "MaintenanceLog",
        back_populates="device",
        lazy="selectin",
    )


class Coop(Base):
    """Farm coop/kandang domain model."""

    __tablename__ = "coops"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    external_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    site_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("sites.id"))
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    coop_type: Mapped[int] = mapped_column(Integer, default=1)
    population: Mapped[int] = mapped_column(Integer, default=0)
    cultivation_type: Mapped[str] = mapped_column(String(50), default="broiler")
    province: Mapped[str | None] = mapped_column(String(100))
    regency: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    floor_count: Mapped[int] = mapped_column(Integer, default=1)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    fully_paired: Mapped[bool] = mapped_column(Boolean, default=False)
    is_mandiri: Mapped[bool] = mapped_column(Boolean, default=True)
    is_distributor: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(String(100))
    meta_data: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    site: Mapped["Site | None"] = relationship("Site", back_populates="coops")
    flocks: Mapped[list["Flock"]] = relationship("Flock", back_populates="coop", lazy="selectin")


class Flock(Base):
    """Floor/device grouping under a kandang."""

    __tablename__ = "flocks"
    __table_args__ = (
        UniqueConstraint("coop_id", "floor_index", name="uq_flocks_coop_floor"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    external_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    coop_id: Mapped[str] = mapped_column(String(36), ForeignKey("coops.id"), index=True)
    floor_index: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    part_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    device_name: Mapped[str | None] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(100), default="Ci-Touch")
    type_code: Mapped[int | None] = mapped_column(Integer)
    version: Mapped[str | None] = mapped_column(String(50))
    version_code: Mapped[int | None] = mapped_column(Integer)
    mode: Mapped[str | None] = mapped_column(String(50))
    day: Mapped[int] = mapped_column(Integer, default=0)
    population: Mapped[int] = mapped_column(Integer, default=0)
    connected: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pairing: Mapped[bool] = mapped_column(Boolean, default=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    last_update: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_temperature: Mapped[float | None] = mapped_column(Float)
    ideal_temperature: Mapped[float | None] = mapped_column(Float)
    humidity: Mapped[float | None] = mapped_column(Float)
    hsi: Mapped[float | None] = mapped_column(Float)
    co2: Mapped[float | None] = mapped_column(Float)
    ammonia: Mapped[float | None] = mapped_column(Float)
    water: Mapped[float | None] = mapped_column(Float)
    wind: Mapped[float | None] = mapped_column(Float)
    lux: Mapped[float | None] = mapped_column(Float)
    device_state: Mapped[dict] = mapped_column(JSONType, default=dict)
    target_temperature: Mapped[dict] = mapped_column(JSONType, default=dict)
    sensors: Mapped[dict] = mapped_column(JSONType, default=dict)
    alarm_config: Mapped[dict] = mapped_column(JSONType, default=dict)
    inverter: Mapped[dict] = mapped_column(JSONType, default=dict)
    features: Mapped[dict] = mapped_column(JSONType, default=dict)
    last_connected: Mapped[dict] = mapped_column(JSONType, default=dict)
    meta_data: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    coop: Mapped["Coop"] = relationship("Coop", back_populates="flocks")
    daily_metrics: Mapped[list["DailyMetric"]] = relationship(
        "DailyMetric",
        back_populates="flock",
        lazy="selectin",
    )
    maintenance_logs: Mapped[list["MaintenanceLog"]] = relationship(
        "MaintenanceLog",
        back_populates="flock",
        lazy="selectin",
    )


class DailyMetric(Base):
    """Daily production and environmental summary per flock."""

    __tablename__ = "daily_metrics"
    __table_args__ = (
        UniqueConstraint("flock_id", "metric_date", name="uq_daily_metrics_flock_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    flock_id: Mapped[str] = mapped_column(String(36), ForeignKey("flocks.id"), index=True)
    metric_date: Mapped[date] = mapped_column(Date, nullable=False)
    age_day: Mapped[int] = mapped_column(Integer, default=0)
    population_initial: Mapped[int] = mapped_column(Integer, default=0)
    population_current: Mapped[int] = mapped_column(Integer, default=0)
    mortality: Mapped[int] = mapped_column(Integer, default=0)
    body_weight: Mapped[float | None] = mapped_column(Float)
    target_weight: Mapped[float | None] = mapped_column(Float)
    feed_consumption: Mapped[float | None] = mapped_column(Float)
    water_consumption: Mapped[float | None] = mapped_column(Float)
    fcr: Mapped[float | None] = mapped_column(Float)
    livability: Mapped[float | None] = mapped_column(Float)
    performance_index: Mapped[float | None] = mapped_column(Float)
    climate_score: Mapped[float | None] = mapped_column(Float)
    control_score: Mapped[float | None] = mapped_column(Float)
    ipc: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    flock: Mapped["Flock"] = relationship("Flock", back_populates="daily_metrics")


class MaintenanceLog(Base):
    """Maintenance log for flock or device support activity."""

    __tablename__ = "maintenance_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    flock_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("flocks.id"), index=True)
    device_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("devices.id"), index=True)
    maintenance_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    technician_name: Mapped[str] = mapped_column(String(100), nullable=False)
    activity: Mapped[str] = mapped_column(Text, nullable=False)
    problem_to_solve: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    photo_before_url: Mapped[str | None] = mapped_column(Text)
    photo_after_url: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    flock: Mapped["Flock | None"] = relationship("Flock", back_populates="maintenance_logs")
    device: Mapped["Device | None"] = relationship("Device", back_populates="maintenance_logs")


class ExternalEndpoint(Base):
    """Registry of external/internal integration endpoints used by the system."""

    __tablename__ = "external_endpoints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    service_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), default="external")
    base_url: Mapped[str | None] = mapped_column(Text)
    ws_url: Mapped[str | None] = mapped_column(Text)
    auth_type: Mapped[str | None] = mapped_column(String(50))
    username: Mapped[str | None] = mapped_column(String(100))
    headers_template: Mapped[dict] = mapped_column(JSONType, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class MarketSearch(Base):
    """Persisted market price search history (replaces JSON file storage)."""

    __tablename__ = "market_searches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    query: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="lainnya", index=True)
    summary: Mapped[str | None] = mapped_column(Text)
    items: Mapped[dict] = mapped_column(JSONType, default=list)
    sources: Mapped[dict] = mapped_column(JSONType, default=list)
    searched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_market_searches_searched_at", "searched_at"),
    )


class AnalysisSession(Base):
    """Persisted AI analysis session for workspace continuity."""

    __tablename__ = "analysis_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str | None] = mapped_column(String(255))
    role_id: Mapped[str | None] = mapped_column(String(50))
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    meta_data: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    messages: Mapped[list["AnalysisMessage"]] = relationship(
        "AnalysisMessage", back_populates="session", lazy="selectin",
    )


class AnalysisMessage(Base):
    """Individual message within an analysis session."""

    __tablename__ = "analysis_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("analysis_sessions.id"), index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sql: Mapped[str | None] = mapped_column(Text)
    data: Mapped[dict | None] = mapped_column(JSONType)
    chart_config: Mapped[dict | None] = mapped_column(JSONType)
    ai_role_id: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    session: Mapped["AnalysisSession"] = relationship("AnalysisSession", back_populates="messages")


class Telemetry(Base):
    """Time-series telemetry data."""

    __tablename__ = "telemetry"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True, default=datetime.utcnow)
    device_id: Mapped[str] = mapped_column(String(36), ForeignKey("devices.id"), primary_key=True)
    metric: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        Index("idx_telemetry_device_time", "device_id", "time"),
        Index("idx_telemetry_metric", "metric"),
    )


class Alarm(Base):
    """Alarm/alert model."""

    __tablename__ = "alarms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    device_id: Mapped[str] = mapped_column(String(36), ForeignKey("devices.id"), index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    ts_open: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    ts_close: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by: Mapped[str | None] = mapped_column(String(100))

    device: Mapped["Device"] = relationship("Device", back_populates="alarms")


class Command(Base):
    """Device command model with acknowledgement tracking."""

    __tablename__ = "commands"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    device_id: Mapped[str] = mapped_column(String(36), ForeignKey("devices.id"), index=True)
    command_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONType, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    ts_sent: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    ts_ack: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    response: Mapped[dict | None] = mapped_column(JSONType)

    device: Mapped["Device"] = relationship("Device", back_populates="commands")
