"""
SQLAlchemy models for IoT Data Center Dashboard.
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, Float, ForeignKey, Text, Boolean, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class Site(Base):
    """Site/Location model."""
    __tablename__ = "sites"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    devices: Mapped[list["Device"]] = relationship("Device", back_populates="site", lazy="selectin")


class Device(Base):
    """IoT Device model with shadow state."""
    __tablename__ = "devices"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    device_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    site_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("sites.id"))
    firmware: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="offline", index=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    # Device Shadow - Desired vs Reported state
    shadow_desired: Mapped[dict] = mapped_column(JSONB, default=dict)
    shadow_reported: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # Metadata
    metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    site: Mapped["Site"] = relationship("Site", back_populates="devices")
    alarms: Mapped[list["Alarm"]] = relationship("Alarm", back_populates="device", lazy="selectin")
    commands: Mapped[list["Command"]] = relationship("Command", back_populates="device", lazy="selectin")


class Telemetry(Base):
    """Time-series telemetry data (TimescaleDB hypertable)."""
    __tablename__ = "telemetry"
    
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True, default=datetime.utcnow)
    device_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"), primary_key=True)
    metric: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    
    __table_args__ = (
        Index("idx_telemetry_device_time", "device_id", "time"),
        Index("idx_telemetry_metric", "metric"),
    )


class Alarm(Base):
    """Alarm/Alert model."""
    __tablename__ = "alarms"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    device_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"), index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # critical, warning, info
    message: Mapped[str] = mapped_column(Text, nullable=False)
    ts_open: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    ts_close: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by: Mapped[str | None] = mapped_column(String(100))
    
    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="alarms")


class Command(Base):
    """Device command model with acknowledgement tracking."""
    __tablename__ = "commands"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    device_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"), index=True)
    command_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, sent, acked, failed, timeout
    ts_sent: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    ts_ack: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    response: Mapped[dict | None] = mapped_column(JSONB)
    
    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="commands")
