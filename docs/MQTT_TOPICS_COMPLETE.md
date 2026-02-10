# Complete MQTT Topic Mapping

**Device:** `6833459276185437281`  
**Broker:** `wss://broker.chickinindonesia.com:8084/mqtt`  
**User:** `dashboard`

---

## 📊 Topic Categories

### 1. **Sensor Data** (Every 5s)

| Topic | GroupName | Description | Value Format |
|-------|-----------|-------------|--------------|
| `data/{pn}/Lantai1/SENSOR/TEMP/8883` | `L1_SENSOR_TEMP` | Temperature L1 | `250` = 25.0°C |
| `data/{pn}/Lantai1/SENSOR/HUMI/8883` | `L1_SENSOR_HUMI` | Humidity L1 | `717` = 71.7% |
| `data/{pn}/Lantai2/SENSOR/TEMP/8883` | `L2_SENSOR_TEMP` | Temperature L2 | `250` = 25.0°C |
| `data/{pn}/Lantai2/SENSOR/HUMI/8883` | `L2_SENSOR_HUMI` | Humidity L2 | `714` = 71.4% |

### 2. **Blower Control (B1-B5)**

| Topic | GroupName | Description | Values |
|-------|-----------|-------------|--------|
| `data/{pn}/{Lantai}/B1/8883` | `L{n}_S_B1` | Blower 1 status | `0` = OFF, `1` = ON |
| `data/{pn}/{Lantai}/B2/8883` | `L{n}_S_B2` | Blower 2 status | `0` = OFF, `1` = ON |
| `data/{pn}/{Lantai}/B3/8883` | `L{n}_S_B3` | Blower 3 status | `0` = OFF, `1` = ON |
| `data/{pn}/{Lantai}/B4/8883` | `L{n}_S_B4` | Blower 4 status | `0` = OFF, `1` = ON |
| `data/{pn}/{Lantai}/B5/8883` | `L{n}_S_B5` | Blower 5 status | `0` = OFF, `1` = ON |

**Command:**
```
cmd/{pn}/{Lantai}/X/B{1-5}/8883
Payload: {"type":"set_var","payload":{"status":"1"}}  // 1=ON, 0=OFF
```

### 3. **Heater & Cooler Control**

| Topic | GroupName | Description | Values |
|-------|-----------|-------------|--------|
| `data/{pn}/{Lantai}/H/8883` | `L{n}_S_H` | Heater status | `0` = OFF, `1` = ON |
| `data/{pn}/{Lantai}/C/8883` | `L{n}_S_C` | Cooler status | `0` = OFF, `1` = ON |

**Command:**
```
cmd/{pn}/{Lantai}/X/H/8883   // Heater ON/OFF
cmd/{pn}/{Lantai}/X/C/8883   // Cooler ON/OFF
Payload: {"type":"set_var","payload":{"status":"1"}}
```

### 4. **Intermittent Mode**

| Topic | GroupName | Description | Values |
|-------|-----------|-------------|--------|
| `cmd/{pn}/{Lantai}/ITMEN/{device}/8883` | `L{n}_ITM_EN_{D}` | Enable intermittent | `0` = Disabled, `1` = Enabled |
| `data/{pn}/{Lantai}/ITMEN/{device}/8883` | | | |
| `cmd/{pn}/{Lantai}/ITMON/{device}/8883` | `L{n}_ITM_ON_{D}` | ON duration (seconds) | `23` = 23s |
| `data/{pn}/{Lantai}/ITMON/{device}/8883` | | | |
| `cmd/{pn}/{Lantai}/ITMOFF/{device}/8883` | `L{n}_ITM_OFF_{D}` | OFF duration (seconds) | `14` = 14s |
| `data/{pn}/{Lantai}/ITMOFF/{device}/8883` | | | |

**Device:** `H` (Heater), `C` (Cooler), `B1`-`B5` (Blowers)

**Example:**
```json
// Enable intermittent mode for Heater with ON=23s, OFF=14s
cmd/6833459276185437281/Lantai2/ITMEN/H/8883
{"type":"set_var","payload":{"_terminalTime":"2026-02-04 12:49:03.000","status":"1"}}

cmd/6833459276185437281/Lantai2/ITMON/H/8883
{"type":"set_var","payload":{"_terminalTime":"2026-02-04 12:49:03.000","status":"23"}}

cmd/6833459276185437281/Lantai2/ITMOFF/H/8883
{"type":"set_var","payload":{"_terminalTime":"2026-02-04 12:49:03.000","status":"14"}}
```

### 5. **Target Temperature Mode**

| Topic | GroupName | Description | Values |
|-------|-----------|-------------|--------|
| `cmd/{pn}/{Lantai}/TAREN/B{n}/8883` | `L{n}_EN_TRGT_B{n}` | Enable target temp | `0`/`1` |
| `data/{pn}/{Lantai}/TAREN/B{n}/8883` | | | |
| `cmd/{pn}/{Lantai}/TARVAL/B{n}/8883` | `L{n}_VAL_TRGT_B{n}` | Target temp value | `260` = 26.0°C |
| `data/{pn}/{Lantai}/TARVAL/B{n}/8883` | | | |

### 6. **Inverter Control**

| Topic | GroupName | Description | Values |
|-------|-----------|-------------|--------|
| `cmd/{pn}/{Lantai}/INV/SET/8883` | `L{n}_INVERTER_WRITE` | Set inverter speed | `0-100` (%) |
| `data/{pn}/{Lantai}/INV/SET/8883` | | Confirm write | |
| `data/{pn}/{Lantai}/INV/VAL/8883` | `L{n}_INVERTER_VAL` | Current inverter value | `22` = 22% |

**Example:**
```json
// Set inverter to 22%
cmd/6833459276185437281/Lantai1/INV/SET/8883
{"type":"set_var","payload":{"_terminalTime":"2026-02-04 12:49:25.000","status":"22"}}
```

### 7. **Alarm Settings**

| Topic | GroupName | Description | Values |
|-------|-----------|-------------|--------|
| `cmd/{pn}/{Lantai}/ALARM/MIN/8883` | `L{n}_LOW_ALARM` | Min temp alarm | `220` = 22.0°C |
| `data/{pn}/{Lantai}/ALARM/MIN/8883` | | | |
| `cmd/{pn}/{Lantai}/ALARM/MINEN/8883` | `L{n}_EN_LOW_ALARM` | Enable min alarm | `0`/`1` |
| `cmd/{pn}/{Lantai}/ALARM/MAX/8883` | `L{n}_HIGH_ALARM` | Max temp alarm | `320` = 32.0°C |
| `data/{pn}/{Lantai}/ALARM/MAX/8883` | | | |
| `cmd/{pn}/{Lantai}/ALARM/MAXEN/8883` | `L{n}_EN_HIGH_ALARM` | Enable max alarm | `0`/`1` |
| `data/{pn}/{Lantai}/ALARM/MAXEN/8883` | | | |

### 8. **Calibration**

| Topic | GroupName | Description | Values |
|-------|-----------|-------------|--------|
| `cmd/{pn}/{Lantai}/CALVAL/TEMP/8883` | `L{n}_CAL_VAL_TEMP` | Calibration offset | `27.0` = +2.7°C offset |
| `data/{pn}/{Lantai}/CALVAL/TEMP/8883` | | | Actual: `27` = 2.7°C |

### 9. **Status & Sync**

| Topic | GroupName | Description | Frequency |
|-------|-----------|-------------|-----------|
| `data/{pn}/{Lantai}/STATUS/C/8883` | `L{n}_STATUS_CONNECTION` | Connection heartbeat | Every 25s |
| `cmd/{pn}/{Lantai}/STATUS/C/8883` | | Connection ACK | Response |
| `cmd/{pn}/REQ/8883` | `REQUEST` | Request sync | On-demand |
| `data/{pn}/REQ/8883` | | Sync response | |
| `data/{pn}/VERSION/8883` | `VERSION` | Firmware version | `1.5.3` |
| `data/{pn}/{Lantai}/SYNC/8883` | `L{n}_SYNCH` | Complete device state | After REQ |

### 10. **Activity Logs**

| Topic | GroupName | Description |
|-------|-----------|-------------|
| `data/{pn}/{Lantai}/LOG/AKSES/8883` | `L{n}_AKSES` | Access control flag |
| `data/{pn}/{Lantai}/LOG/ACT/8883` | `L{n}_DATALOG_MQTT` or custom | Activity log with details |
| `data/{pn}/{Lantai}/LOG/8883` | `L{n}_LOG` | Periodic summary log |

**LOG/ACT Example:**
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
    "inverter": "22",
    ...
  },
  "status": "Berhasil Nyala",
  "tab": "alat"
}
```

---

## 🔄 SYNC Payload Structure

**Topic:** `data/{pn}/{Lantai}/SYNC/8883`

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
  ...
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
  ...
  "enable": "1"
}
```

---

## 📝 Topic Pattern Summary

| Pattern | Description | Example |
|---------|-------------|---------|
| `data/{pn}/{Lantai}/SENSOR/{type}/8883` | Sensor readings | `TEMP`, `HUMI` |
| `data/{pn}/{Lantai}/{device}/8883` | Device status | `B1`, `H`, `C` |
| `cmd/{pn}/{Lantai}/X/{device}/8883` | Direct device control | Turn ON/OFF |
| `cmd/{pn}/{Lantai}/{mode}/{device}/8883` | Mode settings | `ITMEN`, `TAREN`, `ALARM` |
| `data/{pn}/{Lantai}/LOG/{type}/8883` | Logging | `ACT`, `AKSES` |
| `data/{pn}/{Lantai}/SYNC/8883` | Full state snapshot | All device states |

---

## 🎯 Key Discoveries

1. **Intermittent Mode** requires 3 commands: `ITMEN` (enable), `ITMON` (ON time), `ITMOFF` (OFF time)
2. **Target Temperature** requires 2 commands: `TAREN` (enable), `TARVAL` (target value)
3. **Inverter** supports 0-100% speed control
4. **Alarms** have separate enable/value for MIN and MAX
5. **SYNC** contains complete device configuration snapshot
6. **LOG/ACT** provides detailed activity logs with full context
7. **All values** are integers (divide by 10 for decimals where applicable)
