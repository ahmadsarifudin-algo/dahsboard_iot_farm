# Farm Data Analysis Playground

## 1. Overview
The **Farm Data Analysis Playground** is an interactive, AI-powered workspace where users can explore IoT and production data using natural language. It combines the flexibility of a spreadsheet interface with the power of generative AI to democratize data access.

**Key Value Proposition:**
- **Zero-code Analysis**: Ask questions in plain Indonesian/English ("Tampilkan rata-rata bobot ayam di Farm A minggu lalu").
- **Deep Insights**: Correlation analysis between environmental factors (temperature, ammonia) and production metrics (IP, mortality).
- **Multi-Expert AI**: 4 specialized AI roles with automatic detection based on question context.
- **Real-time Market Data**: Business Expert with Google Search grounding for live market prices and trends.

---

## 2. AI Expert Roles

The system uses a multi-role AI architecture. Each role has specialized knowledge and capabilities:

| Role | Icon | Capability | Data Source |
|------|------|-----------|-------------|
| **Data Analyst** | 📊 | SQL generation, IoT data visualization, statistics | Local Database (TimescaleDB) |
| **Farm Management** | 🐔 | Coop management, SOP, feeding, environmental control | Local Database + Knowledge |
| **Disease Expert** | 🦠 | Disease diagnosis, vaccination, biosecurity | Knowledge Base |
| **Business Expert** | 💰 | Market prices, cost analysis, supply chain | **Google Search (real-time)** |

### Auto-Detection
When role is set to "Auto" (✨), the system automatically routes questions using keyword-based scoring:
- Market/price queries → Business Expert
- Temperature/sensor data → Data Analyst
- Disease/mortality questions → Disease Expert
- Farm operations → Farm Management

Keywords are defined in `backend/app/services/ai_roles.py` → `ROLE_DETECTION_KEYWORDS`.

---

## 3. Architecture

### Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │Chat Panel│  │ChartView │  │DataTable  │  │InsightCards│ │
│  └────┬─────┘  └─────▲────┘  └─────▲─────┘  └─────▲─────┘ │
│       │              │             │              │        │
│       ▼              └─────────────┴──────────────┘        │
│  POST /api/v1/analysis/ask                                 │
└──────────────────┬───────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────┐
│                Backend (FastAPI)                           │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              AnalysisService.ask()                    │ │
│  │                                                       │ │
│  │  1. detect_role(question) → role_id                  │ │
│  │  2. generate_response(question, role_id)              │ │
│  │     ├─ SQL roles → Gemini generates SQL               │ │
│  │     └─ Search roles → Gemini + Google Search          │ │
│  │  3. Build chart_config + data                         │ │
│  │     ├─ SQL path: execute_query → chart_config         │ │
│  │     └─ Search path: parse data → chart_config         │ │
│  │  4. Return structured response                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ TimescaleDB   │  │ Gemini API   │  │ Google Search  │ │
│  │ (IoT data)    │  │ (AI engine)  │  │ (market data)  │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Tech Stack
- **Frontend**: Next.js 14, Recharts, Lucide Icons
- **Backend API**: FastAPI (Python)
- **Database**: SQLite (development) / TimescaleDB (production)
- **AI Engine**: Google Gemini 2.0 Flash (via `google-genai` SDK)
- **Search Grounding**: Google Search via Gemini Search tool

---

## 4. API Endpoints

### `POST /api/v1/analysis/ask`

Main analysis endpoint. Accepts natural language questions and returns structured data.

**Request:**
```json
{
    "message": "buatkan grafik harga ayam satu tahun di solo",
    "role_id": "auto",
    "session_id": "session-123"
}
```

**Response:**
```json
{
    "answer": "Berikut grafik harga ayam broiler di Solo...",
    "analysis": "Tren menunjukkan kenaikan pada Q4...",
    "sql": "",
    "data": [
        {"bulan": "Jan 2025", "harga": 19500},
        {"bulan": "Feb 2025", "harga": 20000}
    ],
    "chart_config": {
        "type": "line",
        "xKey": "bulan",
        "yKeys": ["harga"],
        "colors": ["#f59e0b"]
    },
    "insight_cards": [
        {"title": "Harga Tertinggi", "value": "Rp 24.500", "change": "Desember", "icon": "trend"}
    ],
    "anomalies": [],
    "follow_up_questions": ["Bandingkan harga Solo vs Semarang"],
    "severity": "normal",
    "stats": {"harga": {"count": 12, "min": 19500, "max": 26500, "avg": 22000}},
    "role": {"id": "business_expert", "name": "Business Expert", "icon": "💰", "color": "#f59e0b"},
    "grounding_sources": [{"title": "chickin.id", "uri": "https://..."}]
}
```

### `GET /api/v1/analysis/roles`
Returns available AI roles.

### `GET /api/v1/analysis/summary`
Returns current farm summary (device status, alarms, latest metrics).

---

## 5. Chart Generation (Hybrid Approach)

The system supports two data sources for chart generation:

### Path A: SQL-Based (Data Analyst, Farm Management)
```
Question → Gemini generates SQL → Execute on DB → chart_config from data columns
```

### Path B: Search-Based (Business Expert)
```
Question → Gemini + Google Search → Extract price data → chart_config from JSON response
```

The Business Expert prompt instructs Gemini to return structured JSON with:
- `data`: Array of objects with chartable values (numeric, not strings)
- `chart_type`: "line" for trends, "bar" for comparisons
- `x_key` / `y_keys` / `colors`: Chart configuration hints

The backend (`analysis_service.py`) processes both paths identically:
1. Clean and validate data rows
2. Auto-detect keys if not provided
3. Build `chart_config` for frontend rendering
4. Compute statistics (`min`, `max`, `avg`, `stdev`)

### Frontend Chart Rendering
The `ChartView` component in `frontend/app/analysis/page.tsx` renders charts using Recharts:
- Supports `line`, `bar`, and `area` chart types
- Users can toggle chart type via toolbar buttons
- Data is also displayed in a `DataTable` component

---

## 6. Security

### SQL Guardrails
- Read-only database connections
- `LIMIT 500` enforced on all queries
- Dangerous keywords blocked (`DROP`, `DELETE`, `INSERT`, `ALTER`)
- SQL validation before execution

### AI Guardrails
- System prompts explicitly forbid system table queries
- Role-based prompt isolation
- Session-based conversation memory

---

## 7. Key Files

| File | Purpose |
|------|---------|
| `backend/app/services/analysis_service.py` | Core analysis logic (ask, generate_response, execute_query) |
| `backend/app/services/ai_roles.py` | AI role definitions, prompts, keyword detection |
| `backend/app/api/analysis.py` | API route handlers |
| `frontend/app/analysis/page.tsx` | Full playground UI (chat, charts, tables, insight cards) |

---

## 8. Implementation Status

- [x] **Phase 1 — MVP**: Chat interface + SQL query + data table
- [x] **Phase 2 — Visualization**: Recharts integration, auto chart config
- [x] **Phase 2.5 — Multi-Role AI**: 4 expert roles with auto-detection
- [x] **Phase 2.6 — Hybrid Charts**: Search-grounded data → chart rendering (Business Expert)
- [ ] **Phase 3 — Playground**: Excel-like features, saved workspaces, sharing
