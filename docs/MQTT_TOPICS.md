# MQTT Topics Documentation

## Broker Configuration
- **Host**: `broker.chickinindonesia.com`
- **WS Port**: 8083
- **WSS Port**: 8084
- **Path**: `/mqtt`
- **URL**: `wss://broker.chickinindonesia.com:8084/mqtt`
- **Protocol**: MQTT v5
- **Username**: `dashboard`
- **Password**: `dashboard@123`
- **Keepalive**: 60
- **Clean Start**: true
- **Session Expiry**: 0

---

## Topic Patterns

### 1. Status/Feedback Topic (Subscribe)
```
data/{partNumber}/{Lantai}/{device}/8883
```
Dashboard subscribes to receive device status updates.

### 2. Device Command Topic (from device)
```
data/{partNumber}/{Lantai}/X/{device}/8883
```
Device publishes commands, dashboard can subscribe.

### 3. Dashboard Command Topic (Publish)
```
cmd/{partNumber}/{Lantai}/X/{device}/8883
```
Dashboard publishes commands to control device.

---

## Data Flow

### Control FROM Device → Dashboard
```
Device ──publish──> data/{pn}/{Lantai}/X/{device}/8883
                              │
                              ▼
              feedback status check
                              │
                              ▼
         data/{pn}/{Lantai}/{device}/8883 ──subscribe──> Dashboard
```

### Control FROM Dashboard → Device
```
Dashboard ──publish──> cmd/{pn}/{Lantai}/X/{device}/8883
                                    │
                                    ▼
         Device ──subscribe──> data/{pn}/{Lantai}/X/{device}/8883
                                    │
                                    ▼
                    feedback status check
                                    │
                                    ▼
         data/{pn}/{Lantai}/{device}/8883 ──subscribe──> Dashboard
```

---

## Lantai (Floor) Mapping

| Floor Count | Floor Name | Lantai ID |
|-------------|------------|-----------|
| 1 Floor | Dashboard | Lantai1 |
| 2 Floors | Lantai Bawah | Lantai1 |
| 2 Floors | Lantai Atas | Lantai2 |
| 3 Floors | Lantai Bawah | Lantai1 |
| 3 Floors | Lantai Tengah | Lantai2 |
| 3 Floors | Lantai Atas | Lantai3 |

---

## Payload Format

```json
{
  "_terminalTime": "2026-02-02 10:30:16.532",
  "_groupName": "L1_S_B1",
  "status": "1"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `_terminalTime` | string | Timestamp (YYYY-MM-DD HH:mm:ss.SSS) |
| `_groupName` | string | Group identifier (e.g., "L1_S_B1" = Lantai1_Sensor_Blower1) |
| `status` | string | Status value ("0" = OFF, "1" = ON) |

---

## Device Keys

| Key | Description |
|-----|-------------|
| B1 | Blower/Fan 1 |
| B2 | Blower/Fan 2 |
| B3 | Blower/Fan 3 |
| B4 | Blower/Fan 4 |
| B5 | Blower/Fan 5 |
| H | Heater (Pemanas) |
| C | Cooler (Pendingin) |

---

## Topic Types

### Sensor Data (Subscribe to `data/`)
| Description | Subscribe Topic |
|-------------|-----------------|
| Temperature | `data/{partNumber}/{Lantai}/SENSOR/TEMP/8883` |
| Humidity | `data/{partNumber}/{Lantai}/SENSOR/HUMI/8883` |
| Data LOG (per 10 min) | `data/{partNumber}/{Lantai}/LOG/8883` |

#### Sensor Payload Format
```json
{
  "_terminalTime": "2026-02-02 11:00:04.866",
  "_groupName": "L1_SENSOR_TEMP",
  "status": "234"
}
```

#### Sensor Value Scaling
| Sensor | Raw Status | Actual Value | Formula |
|--------|------------|--------------|---------|
| Temperature | `"234"` | 23.4°C | status ÷ 10 |
| Humidity | `"750"` | 75.0% | status ÷ 10 |

#### Group Name Format
| Sensor | Group Name |
|--------|------------|
| Temperature Lantai1 | `L1_SENSOR_TEMP` |
| Humidity Lantai1 | `L1_SENSOR_HUMI` |
| Temperature Lantai2 | `L2_SENSOR_TEMP` |

### Device Control
| Description | Subscribe (Status) | Publish (Command) |
|-------------|-------------------|-------------------|
| Fan 1-5 | `data/{pn}/{L}/B{1-5}/8883` | `cmd/{pn}/{L}/X/B{1-5}/8883` |
| Heater | `data/{pn}/{L}/H/8883` | `cmd/{pn}/{L}/X/H/8883` |
| Cooler | `data/{pn}/{L}/C/8883` | `cmd/{pn}/{L}/X/C/8883` |

### Inverter Control
| Description | Subscribe (Status) | Publish (Command) |
|-------------|-------------------|-------------------|
| Inverter Value | `data/{pn}/{L}/INV/VAL/8883` | `cmd/{pn}/{L}/X/INV/VAL/8883` |
| Inverter Status | `data/{pn}/{L}/INVSTATUS/B{1-5}/8883` | - |
| Inverter State | `data/{pn}/{L}/INVSTATE/B{1-5}/8883` | - |
| Inverter Enable | `data/{pn}/{L}/INVEN/B{1-5}/8883` | `cmd/{pn}/{L}/X/INVEN/B{1-5}/8883` |

### Alarm Control
| Description | Subscribe (Status) | Publish (Command) |
|-------------|-------------------|-------------------|
| Alarm Min Enable | `data/{pn}/{L}/ALARM/MINEN/8883` | `cmd/{pn}/{L}/X/ALARM/MINEN/8883` |
| Alarm Max Enable | `data/{pn}/{L}/ALARM/MAXEN/8883` | `cmd/{pn}/{L}/X/ALARM/MAXEN/8883` |

### Intermittent Mode
| Description | Subscribe (Status) | Publish (Command) |
|-------------|-------------------|-------------------|
| Enable State | `data/{pn}/{L}/ITMEN/{dev}/8883` | `cmd/{pn}/{L}/X/ITMEN/{dev}/8883` |
| Duration ON | `data/{pn}/{L}/ITMON/{dev}/8883` | `cmd/{pn}/{L}/X/ITMON/{dev}/8883` |
| Duration OFF | `data/{pn}/{L}/ITMOFF/{dev}/8883` | `cmd/{pn}/{L}/X/ITMOFF/{dev}/8883` |

### Target Temperature Mode
| Description | Subscribe (Status) | Publish (Command) |
|-------------|-------------------|-------------------|
| Enable State | `data/{pn}/{L}/TAREN/{dev}/8883` | `cmd/{pn}/{L}/X/TAREN/{dev}/8883` |
| Target Value | `data/{pn}/{L}/TARVAL/{dev}/8883` | `cmd/{pn}/{L}/X/TARVAL/{dev}/8883` |
| Tolerance | `data/{pn}/{L}/TARHIS/{dev}/8883` | `cmd/{pn}/{L}/X/TARHIS/{dev}/8883` |

---

## Example Topics

For device with `partNumber = "6833459276185437281"` on Lantai1:

### Subscribe (receive status)
```
data/6833459276185437281/Lantai1/B1/8883        # Fan 1 status
data/6833459276185437281/Lantai1/SENSOR/TEMP/8883  # Temperature
data/6833459276185437281/Lantai1/SENSOR/HUMI/8883  # Humidity
```

### Publish (send command)
```
cmd/6833459276185437281/Lantai1/X/B1/8883       # Control Fan 1
cmd/6833459276185437281/Lantai1/X/H/8883        # Control Heater
cmd/6833459276185437281/Lantai1/X/ITMEN/B2/8883 # Set intermittent Fan 2
```

---

## Command Payload Examples

### Control Fan (ON/OFF)
```json
{
  "_terminalTime": "2026-02-02 10:30:16.532",
  "_groupName": "L1_S_B1",
  "status": "1"
}
```

### Set Intermittent Duration
```json
{
  "_terminalTime": "2026-02-02 10:30:16.532",
  "_groupName": "L1_ITM_B1",
  "value": "30"
}
```

### Set Target Temperature
```json
{
  "_terminalTime": "2026-02-02 10:30:16.532",
  "_groupName": "L1_TAR_B1",
  "value": "28"
}
```
