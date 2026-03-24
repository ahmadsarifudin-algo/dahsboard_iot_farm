# Bugfix: Dashboard Kontrol Kandang Tidak Muncul

**Tanggal:** 2026-03-23  
**Issue:** Kontrol kandang (Fan, Heater, Cooler, Sensor, Alarm, Log) tidak muncul di halaman `/fleet/kandang/[id]`  
**Status:** ✅ Fixed

---

## Problem

Saat membuka halaman detail kandang (`/fleet/kandang/[id]`), kontrol-kontrol berikut tidak tampil:

- Tab Kontrol Fan (ON/OFF per fan)
- Setting Intermittent
- Setting Target Suhu
- Alarm & Settings
- Log Activity
- Sensor (Suhu, Kelembaban, HSI, Amonia, Angin)

## Root Cause Analysis

### Data Flow

```
┌──────────────┐    GET /integrations/chickin/coops    ┌──────────────┐
│   Frontend   │ ─────────────────────────────────────► │   Backend    │
│   page.tsx   │ ◄───────────────────────────────────── │   Adapter    │
└──────┬───────┘    NormalizedCoop[] response           └──────┬───────┘
       │                                                       │
       ▼                                                       ▼
  getKandangList()                                    chickin_list_coops()
  Maps to Kandang[]                                   Fetches from Chickin API
       │
       ▼
  ❌ flocks: [] as Flock[]   ← HARDCODED EMPTY!
       │
       ▼
  selectedFlock = kandang?.flocks?.[0]  → null
       │
       ▼
  productConfig = null  → ALL controls hidden
```

### Akar Masalah

Di file `frontend/lib/iot-api.ts`, fungsi `getKandangList()` line 259:

```typescript
// SEBELUM (BUG):
flocks: [] as Flock[],  // Selalu kosong!
```

Data dari `NormalizedCoop.flocks` (yang berisi `external_id`, `name`, `population`, `connected`) hanya dipakai untuk array `flock` (data populasi ringan), tapi **tidak** dipakai untuk array `flocks` (data Flock lengkap yang dipakai untuk rendering kontrol).

### Impact Chain

1. `getKandangList()` return `kandang.flocks = []`
2. `selectedFlock = kandang?.flocks?.[selectedFloorIndex]` → `null`
3. `productConfig = selectedFlock ? getProductConfigByType(selectedFlock.type) : null` → `null`
4. Semua kontrol gated oleh `selectedFlock && productConfig?.fans > 0` → **hidden**
5. Semua sensor gated oleh `viewMode === 'floor' && selectedFlock` → **hidden**

---

## Fix

### 1. `frontend/lib/iot-api.ts` - Populate flocks dari NormalizedCoop

```typescript
// SESUDAH (FIX):
flocks: c.flocks.map(f => ({
    _id: f.external_id,
    flock_id: f.external_id,
    name: f.name,
    type: f.name || 'Ci-Touch',  // Dipakai oleh getProductConfigByType()
    connected: f.connected,
    // ... field default lainnya
} as Flock)),
```

**Penjelasan:** Setiap flock dari `NormalizedCoop.flocks` sekarang di-map menjadi objek `Flock` dengan field minimal yang diperlukan. Field `type` diisi dari `f.name` (contoh: "Ci-Touch624") untuk dicocokkan oleh `getProductConfigByType()`.

### 2. `frontend/app/fleet/kandang/[id]/page.tsx` - Fetch detail flock lengkap

```typescript
// Setelah menemukan kandang dari list:
if (found.flock && found.flock.length > 0) {
    const flockDetails = await Promise.all(
        found.flock.map(f =>
            iotApi.getFlockById(f._id).catch(() => null)
        )
    )
    const enrichedFlocks = flockDetails
        .filter(Boolean)
        .map(r => r!.data)
    if (enrichedFlocks.length > 0) {
        const updated = { ...found, flocks: enrichedFlocks }
        setKandang(updated)
        updateSensorsFromFlock(enrichedFlocks[0])
    }
}
```

**Penjelasan:** Setelah mendapatkan kandang dari list (yang sekarang punya flock stub), kita fetch detail lengkap setiap flock via `getFlockById()`. Ini memberikan data real-time: sensor values, device state, partNumber, alarm config, dll.

---

## Alur Rendering Kontrol

### Product Config Matching

File `frontend/lib/productConfig.ts` mendefinisikan 5 tipe produk:

| Product | Type Match | Fans | Heater | Cooler | Inverter | NH3 | Wind |
|---------|-----------|------|--------|--------|----------|-----|------|
| **Citouch Basic** | default | 5 | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Citouch Plus** | "plus", "218", "228" | 8 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Citouch Lite** | "lite", "514" | 4 | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ci Sense** | "sense" | 0 | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Ci Diesel** | "diesel", "624" | 1 | ✅ | ✅ | ✅ | ✅ | ✅ |

### Visibility Conditions

```
selectedFlock truthy?
  └─ YES → productConfig = getProductConfigByType(flock.type)
       │
       ├─ productConfig.fans > 0?
       │    └─ YES → Show Fan Control tabs (Kontrol, Intermittent, Target, Alarm, Log)
       │
       ├─ productConfig.heater?
       │    └─ YES → Show Heater controls
       │
       ├─ productConfig.cooler?
       │    └─ YES → Show Cooler controls
       │
       ├─ productConfig.nh3Sensor?
       │    └─ YES → Show Ammonia sensor card
       │
       ├─ productConfig.windSensor?
       │    └─ YES → Show Wind Speed card
       │
       └─ productConfig.isDiesel?
            └─ YES → Show Diesel tab in floor selector
```

---

## Files Changed

| File | Perubahan |
|------|-----------|
| `frontend/lib/iot-api.ts` | `getKandangList()` sekarang populate `flocks[]` dari NormalizedCoop data |
| `frontend/app/fleet/kandang/[id]/page.tsx` | `loadKandangData()` sekarang fetch detail flock lengkap via `getFlockById()` |

## Testing

1. Buka halaman `/fleet/kandang/[id]`
2. Verifikasi tab floor muncul dengan status online/offline
3. Verifikasi kontrol fan (ON/OFF per fan) muncul
4. Verifikasi tab Kontrol Fan, Intermittent, Target, Alarm, Log muncul
5. Verifikasi sensor (Suhu, Kelembaban, HSI) menampilkan data

---

## Fix Lanjutan: MQTT WSS & Sync Loading

**Tanggal:** 2026-03-24 - 2026-03-25
**Status:** ✅ Deployed

### 1. Fix WSS SecurityError

**Problem:** Dashboard di HTTPS (`dashboard.iotsolusi.id`) mencoba `ws://` → browser block karena mixed content.

**Fix** (`frontend/lib/mqtt.ts`):

- Auto-detect protocol: HTTPS → `wss://`, HTTP → `ws://`
- Wrap `mqtt.connect()` dalam `try-catch`
- Nginx WSS proxy: `/mqtt` → `ws://broker:8083/mqtt`

### 2. Timeout Spinner pada Kontrol (Fan/Heater/Cooler)

**Problem:** Saat user klik toggle fan, tidak ada feedback visual saat menunggu respons device.

**Fix** (`frontend/app/fleet/kandang/[id]/page.tsx`):

- Full-card overlay (`bg-dark-500/70` + `backdrop-blur-sm`) + `Loader2` spinner + "Menunggu..."
- `pointer-events-none` mencegah double-click saat loading
- Fix: `controlDevice()` `onFailure` di-defer via `setTimeout(1000ms)` agar spinner sempat render

### 3. Sync Loading Overlay & Failure Popup

**Problem:** Saat page kontrol pertama kali dibuka, semua kontrol tampil OFF (default) sebelum SYNC diterima. User tidak tahu apakah status sedang dimuat.

**Fix** (`frontend/lib/mqtt.ts` + `page.tsx`):

| State | Set True | Set False | UI |
| --- | --- | --- | --- |
| `isSyncing` | `requestSync()` dipanggil | SYNC diterima / 15s timeout | Loading overlay di tab Kontrol |
| `syncFailed` | 15s timeout / publish error | SYNC diterima | Toast error |

- **Loading overlay**: "Memuat status perangkat..." + "Menunggu respons dari device"
- **Failure toast**: "Gagal sinkronisasi status perangkat. Perangkat mungkin offline." (5 detik)

---

## MQTT Sync Flow

### Request → Response

```text
Dashboard                  Broker                    Device (CiTouch)
    │                         │                          │
    ├─ publish ──────────────►│                          │
    │  cmd/{pn}/REQ/8883      │──── forward ────────────►│
    │                         │                          │
    │                         │◄─── response 1 ──────────┤
    │◄── message ─────────────┤  data/{pn}/REQ/8883      │
    │  ACK: status "0"        │                          │
    │                         │◄─── response 2 ──────────┤
    │◄── message ─────────────┤  data/{pn}/VERSION/8883  │
    │  version: "1.5.3"       │                          │
    │                         │◄─── response 3 ──────────┤
    │◄── message ─────────────┤  data/{pn}/Lantai1/SYNC  │
    │  Full state Lantai 1    │                          │
    │                         │◄─── response 4 ──────────┤
    │◄── message ─────────────┤  data/{pn}/Lantai2/SYNC  │
    │  Full state Lantai 2    │                          │
```

### SYNC Payload → UI Mapping

```text
SYNC Key                    → State                 → UI Element
─────────────────────────────────────────────────────────────────
deviceB1Status .. B5Status  → deviceStates.B1-B5    → Fan 1-5 ON/OFF
deviceHStatus               → deviceStates.H        → Heater ON/OFF
deviceCStatus               → deviceStates.C        → Cooler ON/OFF
deviceB1SetEnable           → .intermittent.enabled  → Intermittent badge
deviceB1SetOn/Off           → .intermittent.on/off   → Intermittent durasi
targetTempB1SetEnable       → .target.enabled        → Target badge
targetTempB1Value           → .target.value          → Target suhu
alarmMinStatus/Value        → alarmState.min*        → Alarm Min
alarmMaxStatus/Value        → alarmState.max*        → Alarm Max
inverter                    → inverterState.speed    → Inverter slider
```

---

## MQTT Test Results

**Tanggal:** 2026-03-25  
**Device:** PN `7120249043060102203` (firmware v1.5.3, age 448 hari)

### Lantai 1 (Lantai Bawah)

| Device | Status | Intermittent | Target |
| --- | --- | --- | --- |
| Fan 1 (B1) | 🔴 OFF | OFF | OFF (26.0°C) |
| Fan 2 (B2) | 🔴 OFF | OFF | OFF (27.0°C) |
| Fan 3 (B3) | 🟢 ON | OFF | OFF (28.0°C) |
| Fan 4 (B4) | 🔴 OFF | OFF | OFF (29.0°C) |
| Fan 5 (B5) | 🔴 OFF | OFF | OFF (30.0°C) |
| Heater (H) | 🔴 OFF | OFF | OFF (30.0°C) |
| Cooler (C) | 🔴 OFF | ON | OFF (22.0°C) |

### Lantai 2 (Lantai Atas)

| Device | Status | Intermittent | Target |
| --- | --- | --- | --- |
| Fan 1-5 (B1-B5) | 🟢 ALL ON | OFF | OFF |
| Heater (H) | 🔴 OFF | ON | OFF (30.0°C) |
| Cooler (C) | 🔴 OFF | OFF | OFF (22.0°C) |

---

## Files Changed (Lanjutan)

| File | Perubahan |
| --- | --- |
| `frontend/lib/mqtt.ts` | WSS auto-detect, `isSyncing`/`syncFailed` state, deferred `onFailure` |
| `frontend/app/fleet/kandang/[id]/page.tsx` | Sync loading overlay, failure toast, control card spinner overlay |
