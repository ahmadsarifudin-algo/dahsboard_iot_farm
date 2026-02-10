-- IoT Data Center Dashboard - Database Schema
-- PostgreSQL + TimescaleDB

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Sites table
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    region VARCHAR(100),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_region ON sites(region);
CREATE INDEX idx_sites_location ON sites(latitude, longitude);

-- ============================================
-- Devices table
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    firmware VARCHAR(50),
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMPTZ,
    shadow_desired JSONB DEFAULT '{}',
    shadow_reported JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_key ON devices(device_key);
CREATE INDEX idx_devices_type ON devices(type);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_site ON devices(site_id);

-- ============================================
-- Telemetry table (TimescaleDB hypertable)
-- ============================================
CREATE TABLE IF NOT EXISTS telemetry (
    time TIMESTAMPTZ NOT NULL,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    metric VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL
);

-- Create hypertable (TimescaleDB)
SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);

-- Create indexes for fast queries
CREATE INDEX idx_telemetry_device_time ON telemetry(device_id, time DESC);
CREATE INDEX idx_telemetry_metric ON telemetry(metric);

-- Set up retention policy (90 days)
-- SELECT add_retention_policy('telemetry', INTERVAL '90 days');

-- Set up compression (compress data older than 7 days)
-- ALTER TABLE telemetry SET (
--     timescaledb.compress,
--     timescaledb.compress_segmentby = 'device_id, metric'
-- );
-- SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- ============================================
-- Alarms table
-- ============================================
CREATE TABLE IF NOT EXISTS alarms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    message TEXT NOT NULL,
    ts_open TIMESTAMPTZ DEFAULT NOW(),
    ts_close TIMESTAMPTZ,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100)
);

CREATE INDEX idx_alarms_device ON alarms(device_id);
CREATE INDEX idx_alarms_severity ON alarms(severity);
CREATE INDEX idx_alarms_active ON alarms(ts_close) WHERE ts_close IS NULL;
CREATE INDEX idx_alarms_time ON alarms(ts_open DESC);

-- ============================================
-- Commands table
-- ============================================
CREATE TABLE IF NOT EXISTS commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acked', 'failed', 'timeout')),
    ts_sent TIMESTAMPTZ DEFAULT NOW(),
    ts_ack TIMESTAMPTZ,
    response JSONB
);

CREATE INDEX idx_commands_device ON commands(device_id);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_time ON commands(ts_sent DESC);

-- ============================================
-- Sample seed data
-- ============================================

-- Insert sample sites
INSERT INTO sites (name, latitude, longitude, region, address) VALUES
    ('Bangkok Data Center', 13.7563, 100.5018, 'Asia-Pacific', 'Sukhumvit Road, Bangkok'),
    ('Singapore Hub', 1.3521, 103.8198, 'Asia-Pacific', 'Marina Bay, Singapore'),
    ('Tokyo Office', 35.6762, 139.6503, 'Asia-Pacific', 'Shibuya, Tokyo'),
    ('London Center', 51.5074, -0.1278, 'Europe', 'Canary Wharf, London'),
    ('New York DC', 40.7128, -74.0060, 'Americas', 'Manhattan, New York')
ON CONFLICT DO NOTHING;

-- Insert sample devices
INSERT INTO devices (device_key, name, type, site_id, firmware, status)
SELECT 
    'DEV-' || LPAD(s.n::TEXT, 4, '0'),
    'Sensor ' || s.n,
    CASE s.n % 4
        WHEN 0 THEN 'temperature'
        WHEN 1 THEN 'humidity'
        WHEN 2 THEN 'pressure'
        ELSE 'power'
    END,
    (SELECT id FROM sites ORDER BY RANDOM() LIMIT 1),
    '1.0.' || (s.n % 5),
    CASE WHEN s.n % 3 = 0 THEN 'offline' ELSE 'online' END
FROM generate_series(1, 50) AS s(n)
ON CONFLICT DO NOTHING;

-- Update device last_seen for online devices
UPDATE devices 
SET last_seen = NOW() - (RANDOM() * INTERVAL '1 hour')
WHERE status = 'online';
