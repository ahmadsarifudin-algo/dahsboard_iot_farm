# Farm Data Analysis Playground

## 1. Overview

Farm Data Analysis Playground adalah workspace AI untuk eksplorasi data farm dengan natural language. Modul ini dipakai untuk query analitik, visualisasi chart, tabel hasil query, insight card, dan follow-up question dari backend lokal.

Value utama:

- zero-code analysis untuk user operasional,
- visualisasi chart dari hasil SQL atau hasil search grounding,
- multi-role AI untuk analitik, farm management, disease, dan business,
- dukungan market data real-time melalui Google Search grounding.

### Current Repo Note

Dalam repo saat ini ada dua surface yang berkaitan tetapi berbeda:

- `frontend/app/analysis/page.tsx`: full analysis workspace.
- `frontend/components/dashboard/DataPlayground.tsx`: widget dashboard untuk market intelligence cepat.

Current limitation:

- market search history masih disimpan di file JSON backend,
- memory percakapan analysis masih in-memory per process,
- schema database lokal masih dominan telemetry generic dan belum penuh mendukung domain farm production.

## 2. AI Expert Roles

Sistem memakai multi-role AI architecture:

| Role | Capability | Primary Source |
|---|---|---|
| Data Analyst | SQL generation, visualisasi, statistik | Local database |
| Farm Management | SOP, kontrol lingkungan, operasional kandang | Local database + knowledge |
| Disease Expert | diagnosis, biosecurity, vaksinasi | Knowledge |
| Business Expert | harga pasar, trend, supply chain | Google Search grounding |

Auto-detection dilakukan di `backend/app/services/ai_roles.py` berdasarkan keyword dan konteks pertanyaan.

## 3. Architecture

### Analysis Workspace Flow

```text
Browser analysis workspace
    -> POST /api/v1/analysis/ask
    -> FastAPI analysis API
    -> AnalysisService
    -> Gemini API
    -> optional Google Search grounding
    -> local database query and result shaping
```

### Dashboard Data Playground Flow

```text
Dashboard Data Playground
    -> POST /api/v1/market-prices/search
    -> FastAPI market-prices API
    -> Gemini API + Google Search grounding
    -> market search persistence
```

### Tech Stack

- Frontend: Next.js 13.5.6, Recharts, Lucide Icons
- Backend API: FastAPI
- Database: SQLite atau PostgreSQL pada repo saat ini, dengan rencana perluasan tabel analytics dan domain farm
- AI engine: Google Gemini 2.0 Flash
- Search grounding: Google Search via Gemini tool

## 4. API Endpoints

### Analysis Workspace

`POST /api/v1/analysis/ask`

Request:

```json
{
  "message": "buatkan grafik harga ayam satu tahun di solo",
  "role_id": "auto",
  "session_id": "session-123"
}
```

Response shape:

```json
{
  "answer": "Berikut grafik harga ayam broiler di Solo...",
  "analysis": "Tren menunjukkan kenaikan pada Q4...",
  "sql": "",
  "data": [
    { "bulan": "Jan 2025", "harga": 19500 },
    { "bulan": "Feb 2025", "harga": 20000 }
  ],
  "chart_config": {
    "type": "line",
    "xKey": "bulan",
    "yKeys": ["harga"],
    "colors": ["#f59e0b"]
  },
  "insight_cards": [],
  "anomalies": [],
  "follow_up_questions": ["Bandingkan harga Solo vs Semarang"],
  "severity": "normal",
  "role": {
    "id": "business_expert",
    "name": "Business Expert",
    "icon": "business",
    "color": "#f59e0b"
  },
  "grounding_sources": [
    { "title": "source", "uri": "https://example.com" }
  ]
}
```

Endpoint lain:

- `GET /api/v1/analysis/roles`
- `GET /api/v1/analysis/summary`
- `DELETE /api/v1/analysis/memory/{session_id}`

### Dashboard Data Playground

Widget dashboard untuk pencarian harga cepat memakai:

- `POST /api/v1/market-prices/search`
- `GET /api/v1/market-prices/history`
- `DELETE /api/v1/market-prices/history/{search_id}`

## 5. Data Path

Ada dua path utama:

### Path A: SQL-based analysis

```text
Question -> Gemini generates SQL -> execute on DB -> chart_config -> UI render
```

### Path B: Search-grounded analysis

```text
Question -> Gemini + Google Search -> structured data -> chart_config -> UI render
```

Business Expert dapat memakai search grounding. Data Analyst dan Farm Management lebih dominan ke SQL terhadap database lokal.

## 6. Security

Guardrail yang sudah ada:

- hanya query `SELECT`,
- keyword SQL berbahaya diblok,
- `LIMIT 500` dipaksa untuk query data,
- prompt role dipisah,
- memory percakapan dipisah per session.

## 7. Key Files

| File | Purpose |
|---|---|
| `backend/app/services/analysis_service.py` | core analysis logic, role detection flow, SQL execution, insight shaping |
| `backend/app/services/ai_roles.py` | role definitions dan keyword detection |
| `backend/app/api/analysis.py` | analysis route handlers |
| `backend/app/api/market_price.py` | market price search API dan history storage |
| `frontend/app/analysis/page.tsx` | full analysis workspace UI |
| `frontend/components/dashboard/DataPlayground.tsx` | dashboard market intelligence widget |

## 8. Implementation Status

- Phase 1: chat interface, SQL query, dan data table sudah ada.
- Phase 2: chart rendering dan auto chart config sudah ada.
- Phase 2.5: multi-role AI sudah ada.
- Phase 2.6: search-grounded chart untuk business use case sudah ada.
- Phase 3: saved workspace, sharing, dan persistence penuh belum ada.

### Current Gaps

- `frontend/app/analysis/page.tsx` masih menyimpan `savedQueries` statis di client.
- fallback dummy response masih ada di layer UI, walau request utama sudah ke backend.
- `backend/app/api/market_price.py` masih menyimpan history ke file `market_searches.json`, belum ke database.
- session memory analysis masih in-memory, jadi tidak tahan restart process dan belum bisa dipakai sebagai workspace persistence.
- schema database lokal belum punya tabel khusus untuk analysis sessions, analysis messages, saved queries, atau analysis artifacts.

## 9. Target Direction

Target arsitektur untuk playground:

- dashboard Data Playground tetap fokus ke market intelligence yang ringan,
- analysis workspace menjadi modul terpisah untuk analytics farm yang lebih dalam,
- market search history dipindah ke database,
- analysis session dan artifacts dipersist ke database,
- analysis engine memakai domain farm schema yang lebih kaya daripada telemetry generic saat ini.

## 10. Realization Status (Sprint 1 — 2026-03-18)

### Sudah diimplementasikan

- **`market_searches` table**: model `MarketSearch` di `models.py` (id, query, category, summary, items, sources, searched_at).
- **`market_price.py` migrated**: endpoint `/market-prices/search`, `/history`, `/history/{id}` sekarang membaca/menulis ke database, bukan JSON file.
- **`analysis_sessions` table**: model `AnalysisSession` di `models.py` (id, title, role_id, message_count, last_message_at, meta_data).
- **`analysis_messages` table**: model `AnalysisMessage` di `models.py` (id, session_id, role, content, sql, data, chart_config, ai_role_id).
- **Pydantic schemas**: `MarketSearchResponse`, `AnalysisSessionCreate/Response/Detail`, `AnalysisMessageResponse`.

### Belum diimplementasi

- Wiring `analysis_service.py` ke `AnalysisSession`/`AnalysisMessage` (masih pakai in-memory `ConversationMemory`).
- Tabel `analysis_saved_queries` dan `analysis_artifacts`.
- Fallback dummy response di analysis UI belum dihapus.
- Analysis workspace frontend belum memakai session persistence API.
