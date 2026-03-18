# Task Board

Task board ini mengikuti target arsitektur terbaru dan dipakai untuk memecah migrasi dari kondisi hybrid ke backend lokal yang konsisten.

Referensi utama:

- `docs/ARCHITECTURE_PLAN.md`
- `docs/CHICKIN_INTEGRATION_DESIGN.md`
- `docs/FARM_DATA_ANALYSIS_PLAYGROUND.md`

## Board Status

Status yang dipakai:

- `todo`: belum dikerjakan
- `in_progress`: sedang dikerjakan
- `blocked`: tertahan dependency atau keputusan
- `done`: selesai

## Epic 1: Integration Boundary

| ID | Task | Status | Output |
|---|---|---|---|
| INT-001 | Finalisasi inventory endpoint Chickin yang valid | done | design doc integrasi |
| INT-002 | Definisikan contract lokal untuk auth adapter | done | `ChickinLoginRequest/Response` schema + `POST /api/v1/integrations/chickin/auth/login`, logout, me |
| INT-003 | Definisikan contract lokal untuk coop list dan flock detail | done | `ChickinCoopResponse/FlockResponse` schema + `GET /api/v1/integrations/chickin/coops`, `/flocks/{id}` |
| INT-004 | Definisikan error mapping upstream ke frontend-safe response | done | `IntegrationErrorResponse` schema + `map_upstream_error()` di `chickin_client.py` |
| INT-005 | Definisikan config registry untuk external endpoint | done | `chickin_auth_base_url`, `chickin_iot_base_url` di `config.py` + `ExternalEndpoint` model + CRUD endpoint |

## Epic 2: Backend Adapter

| ID | Task | Status | Output |
|---|---|---|---|
| ADP-001 | Implement auth login adapter | done | `POST /api/v1/integrations/chickin/auth/login` di `chickin_adapter.py` |
| ADP-002 | Implement auth me/profile adapter | done | `GET /api/v1/integrations/chickin/auth/me` di `chickin_adapter.py` (diimplementasi bersama ADP-001) |
| ADP-003 | Implement coop list adapter | done | `GET /api/v1/integrations/chickin/coops` + snapshot upsert ke tabel `coops` |
| ADP-004 | Implement flock detail adapter | done | `GET /api/v1/integrations/chickin/flocks/{flock_id}` + snapshot upsert ke tabel `flocks` |
| ADP-005 | Implement activity log adapter | todo | endpoint histori aktivitas |
| ADP-006 | Tambahkan retry, timeout, dan observability untuk upstream call | todo | policy client upstream (timeout 15s sudah ada, retry belum) |

## Epic 3: Farm Domain Schema

| ID | Task | Status | Output |
|---|---|---|---|
| DB-001 | Tambah schema `coops` | done | model `Coop` di `models.py` dengan `external_id`, snapshot fields, relasi ke `Site` dan `Flock` |
| DB-002 | Tambah schema `flocks` | done | model `Flock` di `models.py` dengan sensor, device state, alarm config, inverter, features |
| DB-003 | Tambah schema `daily_metrics` | done | model `DailyMetric` sudah ada (pre-existing) |
| DB-004 | Tambah schema `maintenance_logs` | done | model `MaintenanceLog` sudah ada (pre-existing) |
| DB-005 | Tambah schema `performance_snapshots` | todo | tabel IP, FCR, livability (bisa diderive dari `daily_metrics` untuk saat ini) |
| DB-006 | Tambah schema `external_endpoints` | done | model `ExternalEndpoint` di `models.py` + CRUD endpoint di `integrations.py` |
| DB-007 | Tambah mapping `external_id` untuk entitas sinkronisasi | done | kolom `external_id` sudah ada di `Coop` dan `Flock`, dipakai oleh adapter upsert |

## Epic 4: Dashboard and Dummy Removal

| ID | Task | Status | Output |
|---|---|---|---|
| UI-001 | Ganti KPI dashboard hardcoded ke aggregate API | todo | dashboard overview real data |
| UI-002 | Ganti map dummy ke backend map API | todo | map page dari DB |
| UI-003 | Ganti performance list dummy ke performance API | todo | performance card real data |
| UI-004 | Ganti fleet registry dummy ke backend domain API | todo | fleet page real data |
| UI-005 | Ganti maintenance log dummy ke backend maintenance API | todo | detail kandang real data |

## Epic 5: Frontend Migration to Local Backend

| ID | Task | Status | Output |
|---|---|---|---|
| FE-001 | Pindahkan flow login dari direct auth ke backend adapter | done | `auth.ts` sekarang memanggil `POST /api/v1/integrations/chickin/auth/login` via backend lokal |
| FE-002 | Pindahkan coop list dari direct IoT ke backend adapter | done | `iot-api.ts` `getKandangList()` dan `getFlockById()` sekarang via `adapterRequest()` ke backend lokal |
| FE-003 | Pindahkan flock detail dari direct IoT ke backend adapter | done | sudah diimplementasikan bersama FE-002 di `iot-api.ts` |
| FE-004 | Hapus hardcoded dependency endpoint Chickin dari UI utama | in_progress | auth dan coop/flock sudah dipindah; sisa: features, summary, chart, activity-log, create/delete kandang masih direct |
| FE-005 | Rapikan shared client API per module | todo | client API layer konsisten |

## Epic 6: Data Playground and Analysis Workspace

| ID | Task | Status | Output |
|---|---|---|---|
| AI-001 | Persist market search history ke tabel `market_searches` | done | model `MarketSearch` + `market_price.py` dimigrasi dari JSON file ke DB persistence |
| AI-002 | Tambah schema `analysis_sessions` | done | model `AnalysisSession` + `AnalysisMessage` di `models.py`, schema di `schemas.py` |
| AI-003 | Tambah schema `analysis_messages` | done | model `AnalysisMessage` diimplementasi bersama AI-002 |
| AI-004 | Tambah schema `analysis_saved_queries` | todo | saved query persistence |
| AI-005 | Tambah schema `analysis_artifacts` | todo | chart/table artifact persistence |
| AI-006 | Pisahkan contract dashboard Data Playground vs analysis workspace | done | docs arsitektur terpisah |
| AI-007 | Hilangkan fallback dummy response dari analysis UI | todo | analysis flow backend-only |

## Epic 7: Realtime and MQTT

| ID | Task | Status | Output |
|---|---|---|---|
| RT-001 | Definisikan ownership data realtime dari broker eksternal | todo | boundary MQTT jelas |
| RT-002 | Simpan event enrichment ke domain table | todo | state device dan farm realtime |
| RT-003 | Standarkan topic-to-entity mapping | todo | mapping telemetry dan alarm |
| RT-004 | Tambah WebSocket layer untuk frontend updates | todo | realtime UI tanpa direct broker coupling |

## Epic 8: Reporting and Aggregates

| ID | Task | Status | Output |
|---|---|---|---|
| AGG-001 | Buat aggregate KPI produksi | todo | mortalitas, livability, FCR |
| AGG-002 | Buat aggregate performance quadrant | todo | ranking kandang |
| AGG-003 | Buat aggregate summary untuk analysis service | todo | AI memakai domain farm kaya |
| AGG-004 | Buat map aggregation API | todo | summary kandang per wilayah |
| AGG-005 | Buat anomaly summary harian | todo | input untuk dashboard dan AI |

## Blockers

| ID | Blocker | Status | Catatan |
|---|---|---|---|
| BLK-001 | Beberapa halaman frontend masih dekat dengan shape upstream Chickin | in_progress | normalization layer sudah ada untuk auth, coop, flock; sisa endpoint belum |
| BLK-002 | Schema backend saat ini masih IoT-generic | done | tabel domain farm (coops, flocks, daily_metrics, maintenance_logs, market_searches, analysis_sessions) sudah ada |
| BLK-003 | Persistence playground belum ada | done | tabel `market_searches`, `analysis_sessions`, `analysis_messages` sudah dibuat |

## Current Sprint Recommendation

Sprint paling rasional berikutnya:

1. `INT-002` sampai `INT-005` — **done**
2. `DB-001`, `DB-002`, `DB-006` — **done**
3. `ADP-001`, `ADP-003`, `ADP-004` — **done**
4. `FE-001`, `FE-002` — **done**
5. `AI-001`, `AI-002` — **done**

### Next Sprint Candidates

1. `ADP-005`, `ADP-006` — activity log adapter dan retry/observability
2. `UI-001` sampai `UI-005` — dummy removal
3. `AI-004`, `AI-005`, `AI-007` — analysis workspace persistence lanjutan
4. `FE-004`, `FE-005` — sisa frontend migration

## Definition of Done

Sebuah task dianggap selesai bila:

- docs contract atau schema sudah diperbarui bila relevan,
- endpoint atau model sudah ada di codebase,
- frontend yang memakai task tersebut sudah pindah ke contract baru bila applicable,
- dummy atau direct-call yang digantikan sudah dihapus,
- ada verifikasi minimal berupa test, static check, atau manual verification note.

## Sprint Realization Log

### Sprint 1 (2026-03-18)

**Completed:**

- INT-002 to INT-005: Integration contracts defined via Pydantic schemas, adapter router, error mapping, config settings
- DB-001, DB-002, DB-006: Models verified (pre-existing). Added `MarketSearch`, `AnalysisSession`, `AnalysisMessage` models
- DB-003, DB-004, DB-007: Discovered as pre-existing (`DailyMetric`, `MaintenanceLog`, `external_id` fields)
- ADP-001, ADP-002, ADP-003, ADP-004: Chickin adapter endpoints implemented in `chickin_adapter.py` with snapshot upsert
- FE-001: `auth.ts` migrated from direct Chickin auth to backend adapter
- FE-002, FE-003: `iot-api.ts` `getKandangList()` and `getFlockById()` migrated to backend adapter
- AI-001: `market_price.py` migrated from JSON file to `MarketSearch` DB table
- AI-002, AI-003: `AnalysisSession` and `AnalysisMessage` models added

**Verification:**

- Python AST syntax check passed on all 9 modified/new backend files
- TypeScript compilation shows no new errors from modified files (pre-existing Next.js type issues only)

**Still using external source directly:**

- `iot-api.ts`: `getDeviceFeatures`, `getFlockSummary`, `getChartData`, `getLogActivity`, `createKandang`, `deleteKandang`, `addFlock`, `deleteFlock`
- `mqtt.ts`: direct MQTT broker connection (by design, not migrated)

**Still dummy or partial:**

- Dashboard KPI cards, map, performance list, fleet registry, maintenance logs (Epic 4)
- Analysis session persistence is schema-only; `analysis_service.py` still uses in-memory `ConversationMemory`
- `analysis_saved_queries` and `analysis_artifacts` tables not yet created
