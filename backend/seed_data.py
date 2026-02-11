"""
Seed database with development/playground data.
Run: python seed_data.py
"""
import asyncio
import random
from datetime import datetime, timedelta
from uuid import uuid4

# Setup path so imports work
import sys
sys.path.insert(0, ".")

from app.core.database import AsyncSessionLocal, init_db
from app.models.models import Site, Device, Telemetry, Alarm


SITES = [
    {"name": "Kandang A1 - Bogor", "latitude": -6.5971, "longitude": 106.8060, "region": "Jawa Barat", "address": "Jl. Raya Bogor KM 32"},
    {"name": "Kandang A2 - Bogor", "latitude": -6.6010, "longitude": 106.8100, "region": "Jawa Barat", "address": "Jl. Raya Bogor KM 35"},
    {"name": "Kandang B1 - Sukabumi", "latitude": -6.9277, "longitude": 106.9300, "region": "Jawa Barat", "address": "Kp. Cisarua, Sukabumi"},
    {"name": "Kandang B2 - Sukabumi", "latitude": -6.9320, "longitude": 106.9350, "region": "Jawa Barat", "address": "Kp. Pasir Angin, Sukabumi"},
    {"name": "Kandang C1 - Subang", "latitude": -6.5714, "longitude": 107.7615, "region": "Jawa Barat", "address": "Desa Cijambe, Subang"},
]

DEVICE_TYPES = ["temperature", "humidity", "pressure", "power"]
METRICS_BY_TYPE = {
    "temperature": [("temperature", 25, 35), ("humidity", 45, 85)],
    "humidity": [("humidity", 40, 90), ("temperature", 24, 34)],
    "pressure": [("pressure", 1000, 1025), ("ammonia", 5, 40)],
    "power": [("power_watts", 100, 500), ("wind_speed", 0.5, 5.0)],
}

ALARM_TEMPLATES = [
    ("critical", "Suhu melebihi batas maksimum ({}°C) di {}"),
    ("warning", "Kelembaban turun di bawah batas minimum ({}%) di {}"),
    ("critical", "Kadar amonia tinggi ({} ppm) di {}"),
    ("warning", "Daya listrik tidak stabil ({} W) di {}"),
    ("info", "Device {} offline lebih dari 30 menit di {}"),
    ("warning", "Suhu mendekati batas kritis ({}°C) di {}"),
    ("critical", "Sensor {} tidak merespons di {}"),
    ("info", "Firmware update tersedia untuk device di {}"),
]


async def seed():
    """Populate database with realistic farm data."""
    await init_db()
    print("Database initialized.")

    async with AsyncSessionLocal() as session:
        # Check if data already exists
        from sqlalchemy import text, select, func
        count = await session.execute(select(func.count()).select_from(Site))
        if count.scalar() > 0:
            print("Database already has data. Skipping seed.")
            print("To re-seed, delete iot_dashboard.db and run again.")
            return

        # --- Sites ---
        sites = []
        for s in SITES:
            site = Site(id=str(uuid4()), **s)
            session.add(site)
            sites.append(site)
        await session.flush()
        print(f"Inserted {len(sites)} sites.")

        # --- Devices (10 per site = 50 total) ---
        devices = []
        for i, site in enumerate(sites):
            for j in range(10):
                dev_num = i * 10 + j + 1
                dev_type = DEVICE_TYPES[j % len(DEVICE_TYPES)]
                device = Device(
                    id=str(uuid4()),
                    device_key=f"DEV-{dev_num:04d}",
                    name=f"Sensor {dev_type.title()} {j+1} - {site.name.split(' - ')[0]}",
                    type=dev_type,
                    site_id=site.id,
                    firmware=f"1.0.{random.randint(0, 5)}",
                    status=random.choice(["online", "online", "online", "offline"]),
                    last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 120)) if random.random() > 0.25 else None,
                    shadow_desired={"interval": 30, "mode": "auto"},
                    shadow_reported={"interval": 30, "mode": "auto", "uptime": random.randint(1000, 100000)},
                    meta_data={"floor": (j % 3) + 1, "position": f"Zone-{chr(65 + j % 4)}"},
                )
                session.add(device)
                devices.append(device)
        await session.flush()
        print(f"Inserted {len(devices)} devices.")

        # --- Telemetry (7 days, every 30 minutes per device) ---
        now = datetime.utcnow()
        telemetry_count = 0
        batch = []

        for device in devices:
            metrics = METRICS_BY_TYPE.get(device.type, [("temperature", 25, 35)])
            # 7 days * 48 readings per day = 336 per metric per device
            for day_offset in range(7):
                for hour in range(0, 24):
                    for minute in [0, 30]:
                        t = now - timedelta(days=day_offset, hours=hour, minutes=minute)
                        for metric_name, low, high in metrics:
                            # Add some realistic variation
                            base = (low + high) / 2
                            # Time-of-day variation (warmer midday)
                            time_factor = 1 + 0.1 * (1 - abs(hour - 13) / 12)
                            # Day variation
                            day_factor = 1 + 0.02 * (day_offset % 3 - 1)
                            value = base * time_factor * day_factor + random.gauss(0, (high - low) * 0.05)
                            value = round(max(low * 0.8, min(high * 1.2, value)), 2)

                            batch.append(Telemetry(
                                time=t,
                                device_id=device.id,
                                metric=metric_name,
                                value=value,
                            ))
                            telemetry_count += 1

                            if len(batch) >= 1000:
                                session.add_all(batch)
                                await session.flush()
                                batch = []

        if batch:
            session.add_all(batch)
            await session.flush()
        print(f"Inserted {telemetry_count} telemetry points.")

        # --- Alarms (20 sample alarms) ---
        alarm_count = 0
        for _ in range(20):
            device = random.choice(devices)
            site = next(s for s in sites if s.id == device.site_id)
            severity, template = random.choice(ALARM_TEMPLATES)

            if "°C" in template:
                val = round(random.uniform(33, 38), 1)
            elif "%" in template:
                val = round(random.uniform(30, 45), 1)
            elif "ppm" in template:
                val = round(random.uniform(25, 50), 1)
            elif "W" in template:
                val = round(random.uniform(50, 150), 0)
            else:
                val = device.device_key

            message = template.format(val, site.name)
            ts_open = now - timedelta(hours=random.randint(1, 168))
            ts_close = ts_open + timedelta(hours=random.randint(1, 24)) if random.random() > 0.4 else None

            alarm = Alarm(
                id=str(uuid4()),
                device_id=device.id,
                severity=severity,
                message=message,
                ts_open=ts_open,
                ts_close=ts_close,
                acknowledged=ts_close is not None,
                acknowledged_by="admin@demo.com" if ts_close else None,
            )
            session.add(alarm)
            alarm_count += 1

        await session.commit()
        print(f"Inserted {alarm_count} alarms.")
        print(f"\n✅ Seed complete! Total: {len(sites)} sites, {len(devices)} devices, {telemetry_count} telemetry, {alarm_count} alarms.")


if __name__ == "__main__":
    asyncio.run(seed())
