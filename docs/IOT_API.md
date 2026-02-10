# IoT Service API Documentation

## Base URL
```
https://prod-iot.chickinindonesia.com/
```

---

## Endpoints Overview

| Method | Endpoint | Nama | Status |
|--------|----------|------|--------|
| POST | `/api/iot/v3/flock` | Add Flock | ⬜ Pending |
| DELETE | `/api/iot/flock/:flockId` | Delete Flock | ⬜ Pending |
| GET | `/api/iot/flock/summary/:flockId` | Grafik Lingkungan | ⬜ Pending |
| GET | `/api/v2/log/chart/custom/flock/:flockId` | Chart Range Custom | ⬜ Pending |
| GET | `/iot/log-activity/flock/:flock` | Log Activity | ⬜ Pending |
| GET | `/api/iot/v2/shed/user` | List Kandang By User | ✅ Validated |
| GET | `/api/iot/v2/flock/:flockId` | Get Flock By Id | ⬜ Pending |
| DELETE | `/api/iot/v2/shed/:idKandang` | Delete Kandang | ⬜ Pending |
| GET | `/api/iot/v3/feature?flockId=:flockId` | Get Device Feature | ⬜ Pending |
| POST | `/api/iot/v2/shed` | Create Kandang | ⬜ Pending |

---

## ✅ List Kandang By User (VALIDATED)

**Endpoint:** `GET /api/iot/v2/shed/user`

**Trigger:** Saat user masuk ke Halaman List Kandang setelah Login

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Response Success (200)

```json
{
  "message": "Data Found",
  "data": [
    {
      "_id": "6978795e85a5c9002d11243d",
      "idOdoo": 7346,
      "kode": "STN",
      "alamat": "yogyakarta",
      "tipe": 1,
      "populasi": 10000,
      "jenisBudidaya": "broiler",
      "province": "DAERAH ISTIMEWA YOGYAKARTA",
      "regency": "KAB. SLEMAN",
      "kota": "KAB. SLEMAN",
      "floor_count": 2,
      "flock_count": 2,
      "active": false,
      "isActive": false,
      "isMandiri": true,
      "fully_paired": true,
      "isDistributor": true,
      "deleted": false,
      "createdBy": "697862f682fa52002702e156",
      "createdAt": "2026-01-27T08:37:50.197Z",
      "updatedAt": "2026-01-29T21:01:57.817Z",
      "flock": [...],
      "flocks": [...],
      "diesel": [],
      "coop_id": "6978795e85a5c9002d11243d"
    }
  ]
}
```

### Kandang Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | MongoDB ID kandang |
| `idOdoo` | number | ID dari Odoo ERP |
| `kode` | string | Kode kandang |
| `alamat` | string | Alamat kandang |
| `tipe` | number | Tipe kandang (lihat enum di bawah) |
| `populasi` | number | Total populasi ayam |
| `jenisBudidaya` | string | Jenis budidaya (broiler, layer, dll) |
| `province` | string | Provinsi |
| `regency` | string | Kabupaten/Kota |
| `kota` | string | Kota |
| `floor_count` | number | Jumlah lantai (= flock_count) |
| `flock_count` | number | Jumlah flock/device (= floor_count) |
| `active` | boolean | Status aktif |

### Tipe Kandang (Enum)

| Value | Nama |
|-------|------|
| 1 | CLOSE HOUSE FULL AUTOMATIC |
| 2 | OPEN HOUSE |
| 3 | CLOSE HOUSE SEMI AUTOMATIC |
| 4 | OPEN HOUSE PANGUNG |
| 5 | OPEN HOUSE POSTAL |
| 6 | OPEN HOUSE TINGKAT |
| 7 | CLOSE HOUSE RETROFIT |

### Floor/Flock Logic

`floor_count` selalu sama dengan `flock_count`. Setiap lantai memiliki 1 device/flock.

**Tampilan Dashboard berdasarkan jumlah lantai:**

| floor_count | UI Behavior | Flock Mapping |
|-------------|------------|---------------|
| 1 | Langsung tampilkan dashboard kontrol | `flock[0]` |
| 2 | Tab: "Lantai Bawah" & "Lantai Atas" | `flock[0]` = Bawah, `flock[1]` = Atas |
| 3 | Tab: "Lantai Bawah", "Lantai Tengah" & "Lantai Atas" | `flock[0]` = Bawah, `flock[1]` = Tengah, `flock[2]` = Atas |

**Flock ID Mapping:**
- `flocks[0]` → Lantai Bawah
- `flocks[1]` → Lantai Tengah (jika 3 lantai) / Lantai Atas (jika 2 lantai)
- `flocks[2]` → Lantai Atas (jika 3 lantai)
| `isActive` | boolean | Status aktif (duplicate) |
| `isMandiri` | boolean | Apakah mandiri |
| `fully_paired` | boolean | Semua device sudah paired |
| `isDistributor` | boolean | Apakah distributor |
| `deleted` | boolean | Soft delete flag |
| `createdBy` | string | User ID yang membuat |
| `createdAt` | string | ISO timestamp dibuat |
| `updatedAt` | string | ISO timestamp diupdate |
| `flock` | array | Array ringkasan flock |
| `flocks` | array | Array detail flock/device |
| `diesel` | array | Data diesel generator |
| `coop_id` | string | ID kandang (alias _id) |

### Flock Object (Summary in `flock` array)

```json
{
  "_id": "6978795e85a5c9002d11243e",
  "populasi": 5000
}
```

### Flock Object (Detail in `flocks` array)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Flock ID |
| `flock_id` | string | Flock ID (alias) |
| `name` | string | Nama lantai (e.g., "Lantai 1") |
| `type` | string | Tipe device (e.g., "CI-Touch125") |
| `typeCode` | number | Kode tipe device |
| `version` | string | Versi firmware |
| `versionCode` | number | Kode versi firmware |
| `partNumber` | string | Part number device |
| `connected` | boolean | Status koneksi |
| `isPairing` | boolean | Status pairing |
| `enable` | boolean | Device enabled |
| `deleted` | boolean | Soft delete flag |
| `mode` | string | Mode operasi (e.g., "mcc") |
| `day` | number | Hari ke-berapa |
| `lastUpdate` | string | ISO timestamp update terakhir |
| `actualTemperature` | number | Suhu aktual (dalam 0.1°C, e.g., 275 = 27.5°C) |
| `idealTemperature` | number | Suhu ideal |
| `humidity` | number | Kelembaban (dalam 0.1%, e.g., 804 = 80.4%) |
| `HSI` | number | Heat Stress Index |
| `co2` | number | Level CO2 |
| `amonia` | number | Level amonia |
| `water` | number | Konsumsi air |
| `wind` | number | Kecepatan angin |
| `lux` | number | Intensitas cahaya |

### Device Control Object (`device` field)

```json
{
  "B1": {
    "status": 0,           // 0=OFF, 1=ON
    "setEnable": 1,        // Intermittent enabled
    "setOff": 10,          // Intermittent OFF duration (seconds)
    "setOn": 10,           // Intermittent ON duration (seconds)
    "inverterEnable": null,
    "inverterState": null,
    "inverterStatus": null
  },
  "H": {
    "status": 1,           // Heater ON
    "setEnable": 0,
    "setOff": 30,
    "setOn": 30
  },
  "C": {
    "status": 0,           // Cooler OFF
    "setEnable": 0,
    "setOff": 20,
    "setOn": 20
  }
}
```

| Key | Description |
|-----|-------------|
| B1-B8 | Blower/Fan 1-8 |
| H | Heater (Pemanas) |
| C | Cooler (Pendingin) |

### Target Temperature Object

```json
{
  "B1": {
    "value": 26,           // Target temp in °C
    "hysteresis": 0.5,     // Hysteresis value
    "setEnable": 0         // Target mode enabled
  }
}
```

### Sensors Object

```json
{
  "temperature1": { "value": 0, "calibration": 0 },
  "temperature2": { "value": 0, "calibration": 0 },
  "temperature3": { "value": 0, "calibration": 0 },
  "temperatureOutside": { "value": 0, "calibration": 0 },
  "ammonia": { "value": 0, "calibration": 0 },
  "humidity": { "value": 0, "calibration": 0 },
  "co2": { "value": 0, "calibration": 0 }
}
```

### Alarm Object

```json
{
  "min": { "value": 5, "status": false },
  "max": { "value": 40, "status": false }
}
```

### Features Object

```json
{
  "version": {
    "currentVersion": "1.5.3",
    "latestVersion": "1.5.0"
  },
  "list_features": [...],
  "available_features": [...]
}
```

### Available Feature Tags

| Tag | Name |
|-----|------|
| MANUAL_FAN | Manual Control Fan |
| MANUAL_HEATER | Manual Control Pemanas |
| MANUAL_COOLER | Manual Control Pendingin |
| ITM_FAN | Intermittent Fan |
| ITM_COOLER | Intermittent Pendingin |
| ITM_HEATER | Intermittent Pemanas |
| CALIBRATION | Calibration |
| LING_KANDANG | Lingkungan Kandang |
| CON_STATUS | Status Koneksi |
| ALARM | Alarm |
| INVERTER | Inverter |
| TARGET_TEMP | Target Temperature |
| LOG_ACTIVITY | Log Aktivitas |

### Last Connected Object

```json
{
  "lastConnect": "Online",
  "timeAgo": "3 hari yang lalu",
  "time": "2026-01-27T08:54:04.514Z"
}
```

---

## Other Endpoints (Pending Validation)

### 2. Add Flock (Pairing Device)

**Endpoint:** `POST /api/iot/v3/flock`

**Trigger:** Saat user melakukan pairing device baru

**Status:** ⬜ Pending validation

---

### 3. Delete Flock (Putuskan Perangkat)

**Endpoint:** `DELETE /api/iot/flock/:flockId`

**Trigger:** Tombol "Putuskan Perangkat" di halaman Device Setting

**Status:** ⬜ Pending validation

---

### 4. Grafik Lingkungan Kandang (Summary)

**Endpoint:** `GET /api/iot/flock/summary/:flockId`

**Trigger:** Saat user membuka halaman Lingkungan Kandang

**Status:** ⬜ Pending validation

---

### 5. Chart dengan Range Custom

**Endpoint:** `GET /api/v2/log/chart/custom/flock/:flockId`

**Trigger:** Saat user mengubah range tanggal di halaman Lingkungan Kandang

**Status:** ⬜ Pending validation

---

### 6. Log Activity

**Endpoint:** `GET /iot/log-activity/flock/:flock`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| sort | number | -1 | Urutan data |
| limit | number | 100 | Jumlah data |
| lang | string | en | Bahasa |

**Status:** ⬜ Pending validation

---

### 7. Get Flock By Id

**Endpoint:** `GET /api/iot/v2/flock/:flockId`

**Trigger:** Saat user membuka Dashboard Control IoT

**Status:** ⬜ Pending validation

---

### 8. Delete Kandang

**Endpoint:** `DELETE /api/iot/v2/shed/:idKandang`

**Trigger:** Tombol Hapus Kandang di Bottom Sheet

**Status:** ⬜ Pending validation

---

### 9. Get Device Feature

**Endpoint:** `GET /api/iot/v3/feature?flockId=:flockId`

**Trigger:** Saat user membuka Dashboard Control IoT

**Status:** ⬜ Pending validation

---

### 10. Create Kandang

**Endpoint:** `POST /api/iot/v2/shed`

**Trigger:** Tombol Simpan di halaman Tambah Kandang

**Status:** ⬜ Pending validation

---

## Validation Progress

| # | Endpoint | Status | Validated Date |
|---|----------|--------|----------------|
| 1 | Add Flock | ⬜ Pending | - |
| 2 | Delete Flock | ⬜ Pending | - |
| 3 | Grafik Summary | ⬜ Pending | - |
| 4 | Chart Custom | ⬜ Pending | - |
| 5 | Log Activity | ⬜ Pending | - |
| 6 | **List Kandang** | ✅ Validated | 2026-01-30 |
| 7 | Get Flock | ⬜ Pending | - |
| 8 | Delete Kandang | ⬜ Pending | - |
| 9 | Device Feature | ⬜ Pending | - |
| 10 | Create Kandang | ⬜ Pending | - |
