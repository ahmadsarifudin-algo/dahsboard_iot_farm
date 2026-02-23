# MQTT Documentation — IoT Data Center Dashboard

> Complete reference for MQTT broker connection, topic structure, payloads, and device communication protocol.

---

## 1. Broker Connection

### Production Broker (Chickin Indonesia)

| Parameter | Value |
|-----------|-------|
| **Host** | `broker.chickinindonesia.com` |
| **MQTT Port** | `1883` (TCP) |
| **WebSocket Port** | `8083` (WS) |
| **Secure WebSocket Port** | `8084` (WSS) |
| **WebSocket Path** | `/mqtt` |
| **WSS URL** | `wss://broker.chickinindonesia.com:8084/mqtt` |
| **WS URL** | `ws://broker.chickinindonesia.com:8083/mqtt` |
| **Protocol** | MQTT v5 |
| **Username** | `********` |
| **Password** | `********` |
| **Keepalive** | `60` seconds |
| **Clean Start** | `true` |

### Local Development Broker (EMQX via Docker)

| Parameter | Value |
|-----------|-------|
| **Host** | `localhost` |
| **MQTT Port** | `1883` |
| **WebSocket Port** | `8083` |
| **WSS Port** | `8084` |
| **Dashboard URL** | `http://localhost:18083` |
| **Dashboard User** | `admin` / `public` |
| **Docker Command** | `docker compose up -d emqx` |

### Backend API WebSocket

| Parameter | Value |
|-----------|-------|
| **URL** | `ws://localhost:8000/ws` |
| **Purpose** | Real-time event relay (backend → frontend) |
| **Auto-reconnect** | Yes (3 second interval) |

---

## 2. Topic Pattern Overview

All topics follow this structure:

```
{direction}/{partNumber}/{floor}/{category}/{8883}
```

| Segment | Description | Example |
|---------|-------------|---------|
| `direction` | `data` (device→dashboard) or `cmd` (dashboard→device) | `data`, `cmd` |
| `partNumber` | Device Part Number (unique ID) | `6833459276185437281` |
| `floor` | Floor identifier | `Lantai1`, `Lantai2`, `Lantai3` |
| `category` | Device/sensor/action type | `B1`, `SENSOR/TEMP`, `X/H` |
| `8883` | Protocol suffix (always `8883`) | `8883` |

### Floor Mapping

| Jumlah Lantai | Nama | ID |
|---------------|------|----|
| 1 Lantai | Dashboard | `Lantai1` |
| 2 Lantai | Lantai Bawah | `Lantai1` |
| 2 Lantai | Lantai Atas | `Lantai2` |
| 3 Lantai | Lantai Bawah | `Lantai1` |
| 3 Lantai | Lantai Tengah | `Lantai2` |
| 3 Lantai | Lantai Atas | `Lantai3` |

---

## 3. Topic Categories

> `{pn}` = Part Number, `{L}` = Lantai (e.g., `Lantai1`)

### 3.1 Sensor Data (Subscribe — setiap 5 detik)

| Topic | GroupName | Deskripsi | Format Nilai |
|-------|-----------|-----------|--------------|
| `data/{pn}/{L}/SENSOR/TEMP/8883` | `L{n}_SENSOR_TEMP` | Suhu | `250` = 25.0°C |
| `data/{pn}/{L}/SENSOR/HUMI/8883` | `L{n}_SENSOR_HUMI` | Kelembaban | `717` = 71.7% |

**Rumus konversi:** `nilai / 10 = actual` (contoh: `234` ÷ 10 = `23.4°C`)

**Payload:**
```json
{
  "_terminalTime": "2026-02-02 11:00:04.866",
  "_groupName": "L1_SENSOR_TEMP",
  "status": "234"
}
```

---

### 3.2 Blower/Fan Control (B1–B5)

| Subscribe (Status) | Publish (Command) |
|--------------------|-------------------|
| `data/{pn}/{L}/B{1-5}/8883` | `cmd/{pn}/{L}/X/B{1-5}/8883` |

**Status values:** `0` = OFF, `1` = ON

**Command payload:**
```json
{
  "type": "set_var",
  "payload": {
    "_terminalTime": "2026-02-04 12:49:03.000",
    "status": "1"
  }
}
```

---

### 3.3 Heater & Cooler Control

| Device | Subscribe (Status) | Publish (Command) |
|--------|--------------------|--------------------|
| Heater | `data/{pn}/{L}/H/8883` | `cmd/{pn}/{L}/X/H/8883` |
| Cooler | `data/{pn}/{L}/C/8883` | `cmd/{pn}/{L}/X/C/8883` |

**Status values:** `0` = OFF, `1` = ON

---

### 3.4 Inverter Control

| Deskripsi | Subscribe | Publish |
|-----------|-----------|---------|
| Set Speed | `data/{pn}/{L}/INV/SET/8883` | `cmd/{pn}/{L}/INV/SET/8883` |
| Current Value | `data/{pn}/{L}/INV/VAL/8883` | — |
| Enable per-Blower | `data/{pn}/{L}/INVEN/B{n}/8883` | `cmd/{pn}/{L}/X/INVEN/B{n}/8883` |
| Status per-Blower | `data/{pn}/{L}/INVSTATUS/B{n}/8883` | — |

**Speed range:** `0–100` (%)

**Payload:**
```json
{
  "type": "set_var",
  "payload": {
    "_terminalTime": "2026-02-04 12:49:25.000",
    "status": "22"
  }
}
```

---

### 3.5 Intermittent Mode

Requires **3 commands** per device: Enable, ON duration, OFF duration.

| Deskripsi | Subscribe | Publish |
|-----------|-----------|---------|
| Enable | `data/{pn}/{L}/ITMEN/{dev}/8883` | `cmd/{pn}/{L}/ITMEN/{dev}/8883` |
| ON Duration (s) | `data/{pn}/{L}/ITMON/{dev}/8883` | `cmd/{pn}/{L}/ITMON/{dev}/8883` |
| OFF Duration (s) | `data/{pn}/{L}/ITMOFF/{dev}/8883` | `cmd/{pn}/{L}/ITMOFF/{dev}/8883` |

**Device:** `H` (Heater), `C` (Cooler), `B1`–`B5` (Blower)

**Contoh — Set Heater intermittent ON=23s, OFF=14s:**
```json
// 1. Enable intermittent
Topic: cmd/6833459276185437281/Lantai2/ITMEN/H/8883
{"type":"set_var","payload":{"status":"1"}}

// 2. Set ON duration
Topic: cmd/6833459276185437281/Lantai2/ITMON/H/8883
{"type":"set_var","payload":{"status":"23"}}

// 3. Set OFF duration
Topic: cmd/6833459276185437281/Lantai2/ITMOFF/H/8883
{"type":"set_var","payload":{"status":"14"}}
```

---

### 3.6 Target Temperature Mode

Requires **2 commands** per device: Enable + Target value.

| Deskripsi | Subscribe | Publish |
|-----------|-----------|---------|
| Enable | `data/{pn}/{L}/TAREN/B{n}/8883` | `cmd/{pn}/{L}/TAREN/B{n}/8883` |
| Target Value | `data/{pn}/{L}/TARVAL/B{n}/8883` | `cmd/{pn}/{L}/TARVAL/B{n}/8883` |
| Tolerance | `data/{pn}/{L}/TARHIS/B{n}/8883` | `cmd/{pn}/{L}/TARHIS/B{n}/8883` |

**Value format:** `260` = 26.0°C (divide by 10)

---

### 3.7 Alarm Settings

| Deskripsi | Subscribe | Publish |
|-----------|-----------|---------|
| Min Temp Value | `data/{pn}/{L}/ALARM/MIN/8883` | `cmd/{pn}/{L}/ALARM/MIN/8883` |
| Min Enable | `data/{pn}/{L}/ALARM/MINEN/8883` | `cmd/{pn}/{L}/ALARM/MINEN/8883` |
| Max Temp Value | `data/{pn}/{L}/ALARM/MAX/8883` | `cmd/{pn}/{L}/ALARM/MAX/8883` |
| Max Enable | `data/{pn}/{L}/ALARM/MAXEN/8883` | `cmd/{pn}/{L}/ALARM/MAXEN/8883` |

**Value format:** `220` = 22.0°C, `320` = 32.0°C

---

### 3.8 Calibration

| Deskripsi | Subscribe | Publish |
|-----------|-----------|---------|
| Temp Offset | `data/{pn}/{L}/CALVAL/TEMP/8883` | `cmd/{pn}/{L}/CALVAL/TEMP/8883` |

**Value format:** `27` = +2.7°C offset

---

### 3.9 Status & Sync

| Topic | Deskripsi | Frekuensi |
|-------|-----------|-----------|
| `data/{pn}/{L}/STATUS/C/8883` | Connection heartbeat | Setiap 25 detik |
| `cmd/{pn}/{L}/STATUS/C/8883` | Connection ACK (response) | On-demand |
| `cmd/{pn}/REQ/8883` | Request full sync | On-demand |
| `data/{pn}/REQ/8883` | Sync response | After REQ |
| `data/{pn}/VERSION/8883` | Firmware version | `1.5.3` |
| `data/{pn}/{L}/SYNC/8883` | Complete device state snapshot | After REQ |

---

### 3.10 Activity Logs

| Topic | GroupName | Deskripsi |
|-------|-----------|-----------|
| `data/{pn}/{L}/LOG/AKSES/8883` | `L{n}_AKSES` | Access control flag |
| `data/{pn}/{L}/LOG/ACT/8883` | `L{n}_DATALOG_MQTT` | Detail activity log |
| `data/{pn}/{L}/LOG/8883` | `L{n}_LOG` | Periodic summary (10 min) |

**LOG/ACT Payload:**
```json
{
  "_terminalTime": "2026-02-04 12:49:30.000",
  "access": "apps",
  "desc": "Kipas Inverter",
  "flag": "success",
  "_groupTag": "Lantai1",
  "mode": "Manual",
  "nilai": {
    "temp": "250.0",
    "hum": "716.0",
    "inverter": "22"
  },
  "status": "Berhasil Nyala",
  "tab": "alat"
}
```

---

## 4. SYNC Payload (Full State Snapshot)

**Topic:** `data/{pn}/{L}/SYNC/8883`

Dikirim device saat menerima `cmd/{pn}/REQ/8883`. Berisi seluruh state device:

```json
{
  "_terminalTime": "2026-02-04 12:50:06.266",
  "_groupName": "L1_SYNCH",
  "age": "399",
  "version": "1.5.3",
  "inverter": "22",
  "inverterSetEnable": "0",
  "deviceB1Status": "1",
  "deviceB1SetEnable": "1",
  "deviceB1SetOff": "420",
  "deviceB1SetOn": "420",
  "deviceB2Status": "0",
  "deviceB2SetEnable": "0",
  "deviceHStatus": "1",
  "deviceHSetEnable": "1",
  "deviceHSetOff": "680",
  "deviceHSetOn": "510",
  "deviceCStatus": "0",
  "deviceCSetEnable": "1",
  "deviceCSetOff": "560",
  "deviceCSetOn": "942",
  "alarmMinValue": "220",
  "alarmMinStatus": "1",
  "alarmMaxValue": "320",
  "alarmMaxStatus": "0",
  "targetTempB1SetEnable": "1",
  "targetTempB1Value": "320",
  "targetTempB1His": "10",
  "enable": "1"
}
```

---

## 5. Data Flow Diagrams

### Device → Dashboard (Status Update)
```
Device ──publish──▶ data/{pn}/{L}/{device}/8883 ──subscribe──▶ Dashboard
```

### Dashboard → Device (Control Command)
```
Dashboard ──publish──▶ cmd/{pn}/{L}/X/{device}/8883
                              │
                              ▼
                         Device processes
                              │
                              ▼
          data/{pn}/{L}/{device}/8883 ──subscribe──▶ Dashboard (confirmation)
```

### Full Sync Flow
```
Dashboard ──publish──▶ cmd/{pn}/REQ/8883
                              │
                              ▼
                         Device responds
                              │
                              ▼
          data/{pn}/{L}/SYNC/8883 ──subscribe──▶ Dashboard (full state)
```

---

## 6. Backend MQTT Integration

Backend (`mqtt_service.py`) uses a generic topic pattern for internal processing:

| Subscribe Pattern | Purpose |
|-------------------|---------|
| `iot/+/+/telemetry` | Sensor data relay |
| `iot/+/+/status` | Device online/offline |
| `iot/+/+/shadow/reported` | Device state shadow |
| `iot/+/+/commands/response` | Command acknowledgments |

### Publish Commands
```
iot/{site_id}/{device_id}/commands         # Send command to device
iot/{site_id}/{device_id}/shadow/desired   # Set desired state
```

### WebSocket Events (Backend → Frontend)
```
ws://localhost:8000/ws
```

| Event Type | Payload |
|------------|---------|
| `telemetry` | `{ device_id, metrics, timestamp }` |
| `status` | `{ device_id, status, last_seen }` |
| `shadow` | `{ device_id, reported }` |
| `command_ack` | `{ device_id, command_id, status, response }` |
| `alarm` | `{ ... alarm details }` |
| `stats` | `{ ... dashboard stats }` |

---

## 7. Quick Reference — Key Rules

1. **All raw values are integers** — divide by 10 for decimals (e.g., `250` = 25.0°C)
2. **Intermittent Mode** requires 3 sequential commands: `ITMEN`, `ITMON`, `ITMOFF`
3. **Target Temperature** requires 2 commands: `TAREN`, `TARVAL`
4. **`8883`** is always the last segment in CiTouch topics
5. **`X`** prefix in command topics means "execute" (e.g., `cmd/.../X/B1/...`)
6. **SYNC** gives complete device state — use after connecting to restore UI
7. **Heartbeat** (`STATUS/C`) is sent every 25 seconds — no heartbeat = device offline
