# Agent Guidelines — IoT Data Center Dashboard

> This file provides context for AI coding agents (Antigravity, Claude Code, Cursor, Copilot, etc.)
> to understand and continue working on this project effectively.

## Project Summary

This is a **full-stack IoT monitoring dashboard** for poultry farms. It connects to hardware controllers
(CiTouch devices) via MQTT and provides real-time monitoring, device control, fleet management,
and an AI-powered data analysis playground with multi-expert AI roles.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS 3.4
- **Backend**: FastAPI (Python 3.11+) + SQLAlchemy 2.0 (async) + asyncpg
- **Database**: TimescaleDB (PostgreSQL 15 with time-series extension) / SQLite (dev fallback)
- **AI Engine**: Google Gemini 2.0 Flash (via `google-genai` SDK)
- **MQTT Broker**: EMQX 5.4 (devices connect via MQTT, frontend via WebSocket on port 8083)
- **Cache**: Redis 7
- **Orchestration**: Docker Compose

## Key Directories

| Path | What it is |
|------|-----------|
| `frontend/` | Next.js app. Run with `cd frontend && npm install && npm run dev` |
| `frontend/app/` | App Router pages — each folder = a route |
| `frontend/app/analysis/` | **AI Data Playground** — chat, charts, tables, insight cards |
| `frontend/components/layout/` | Sidebar, Header, LayoutWrapper (controls which pages get dashboard layout) |
| `frontend/components/fleet/` | Reusable fleet/device components (modals, cards) |
| `frontend/lib/` | API client (`iot-api.ts`), auth (`auth.ts`), theme (`theme.tsx`) |
| `backend/` | FastAPI app. Run with `cd backend && pip install -r requirements.txt && python main.py` |
| `backend/app/api/` | Route handlers (kandang, devices, stats, alarms, auth, **analysis**, settings, market_price) |
| `backend/app/models/` | SQLAlchemy models |
| `backend/app/services/` | Business logic — **analysis_service.py**, **ai_roles.py**, MQTT, WebSocket |
| `docs/` | API docs, MQTT topics, architecture, **FARM_DATA_ANALYSIS_PLAYGROUND.md** |
| `database/init.sql` | Database schema initialization |

## Important Patterns & Conventions

### Frontend

1. **Layout System**: `LayoutWrapper.tsx` uses a route whitelist (`dashboardRoutes`) to decide which pages
   get the Sidebar + Header. When adding new pages, **add the route to this whitelist**.

2. **API Client**: All API calls go through `frontend/lib/iot-api.ts`. It handles auth headers,
   base URL, and error formatting. Use `iotApi.xxx()` methods, don't use raw `fetch`.
   - **Exception**: The Analysis page (`/analysis`) uses direct `fetch()` to `localhost:8000/api/v1/analysis/ask`.

3. **Auth Flow**: Login → JWT token stored in localStorage → attached to API calls via `auth.ts`.
   `AuthContext.tsx` provides React context. Pages check `authService.isAuthenticated()` on mount.

4. **MQTT in Frontend**: Direct WebSocket connection to EMQX (port 8083) from browser.
   Used for real-time telemetry display and device control commands.

5. **Styling**: Tailwind CSS with custom dark theme tokens defined in `tailwind.config.js`:
   - `dark-100` through `dark-500` (darkest)
   - `primary-400` through `primary-600`
   - Use `card`, `btn-primary`, `btn-secondary`, `input` utility classes from `globals.css`

6. **Icons**: Lucide React exclusively. Import from `lucide-react`.

7. **Charts**: Recharts library. The Analysis page uses `BarChart`, `LineChart`, `AreaChart` components
   with `ResponsiveContainer`. Chart type is controlled by `chart_config.type` from the backend.

8. **Dynamic UI**: Kandang detail page (`fleet/kandang/[id]/page.tsx`) renders different
   tabs/controls based on `productType` from device config. This is a critical pattern.

### Backend

1. **Async Everything**: All DB operations use async SQLAlchemy + asyncpg. All route handlers are `async def`.

2. **Pydantic v2**: Schemas use `model_config = ConfigDict(from_attributes=True)` pattern.

3. **MQTT Mapper**: `backend/app/services/mqtt_mapper.py` maps between MQTT topic/payload format
   and database models. CiTouch devices use a specific binary/JSON protocol.

4. **Auth**: JWT-based. `backend/app/core/security.py` handles token creation/validation.
   Protected routes use `Depends(get_current_user)`.

5. **Settings Service**: `backend/app/api/settings.py` manages runtime configuration including
   Gemini API key, model selection, and feature toggles. Settings stored in DB table `app_settings`.

## AI Analysis Service (Critical Section)

The analysis service is the most complex part of the backend. Understand this thoroughly before modifying.

### Architecture

```
User Question → detect_role() → generate_response() → ask()
                    ↓                    ↓                ↓
             keyword scoring     Gemini API call    Build response
                    ↓                    ↓                ↓
             role_id selected    SQL or Search       chart_config + data + insights
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `backend/app/services/ai_roles.py` | 4 role definitions, system prompts, `ROLE_DETECTION_KEYWORDS`, `detect_role()` | ~490 |
| `backend/app/services/analysis_service.py` | `AnalysisService` class — `ask()`, `generate_response()`, `execute_safe_query()` | ~530 |
| `backend/app/api/analysis.py` | FastAPI route handlers for `/analysis/ask`, `/analysis/roles`, `/analysis/summary` | ~70 |

### AI Roles

| Role ID | Name | Search | Data Source |
|---------|------|--------|-------------|
| `data_analyst` | Data Analyst 📊 | ❌ | SQL queries on local IoT database |
| `farm_management` | Farm Management 🐔 | ❌ | SQL + domain knowledge |
| `disease_expert` | Disease Expert 🦠 | ❌ | Domain knowledge base |
| `business_expert` | Business Expert 💰 | ✅ Google Search | Real-time web search for market data |

### Auto-Detection (`detect_role()`)

When `role_id = "auto"`, the system scores keywords from `ROLE_DETECTION_KEYWORDS` dict.
Highest scoring role is selected. If no keywords match, defaults to `data_analyst`.

**Important**: When adding new keywords, ensure domain-specific terms (like city names, product names)
are in the right role to avoid mis-routing. The Business Expert needs to win over Data Analyst
for market/price queries.

### Two Data Paths (Hybrid Chart Generation)

**Path A — SQL-based** (Data Analyst, Farm Management):
```
Question → Gemini generates SQL → execute_safe_query() → chart_config from column types
```

**Path B — Search-based** (Business Expert):
```
Question → Gemini + Google Search grounding → structured JSON data → chart_config from response
```

The Business Expert prompt instructs Gemini to return structured data with `data` array,
`chart_type`, `x_key`, `y_keys`. The `ask()` method in `analysis_service.py` detects this
and builds `chart_config` for the frontend.

### Gemini Configuration

- Model: `gemini-2.0-flash` (configurable via Settings page)
- API key stored in `app_settings` table, managed via `/api/v1/settings` endpoint
- Search grounding enabled via `google.genai.types.Tool(google_search=...)` for `uses_search: True` roles
- Session memory: `ChatSession` cached per `(role_id, session_id)` pair

## Database Models

Key models in `backend/app/models/models.py`:
- `Site` — A kandang (farm house) with address, type, population
- `Device` — An IoT controller attached to a site/floor
- `Telemetry` — Time-series sensor data (temperature, humidity, etc.)
- `Alarm` — Alert rules and triggered alarms
- `Command` — Commands sent to devices (fan, heater, etc.)
- `AppSettings` — Runtime configuration (Gemini API key, model, features)

## MQTT Topics

Devices use topic pattern: `citouch/{device_id}/{action}`

Key topics documented in `docs/MQTT_TOPICS_COMPLETE.md`:
- `citouch/+/telemetry` — Device publishes sensor data
- `citouch/+/command` — Dashboard publishes control commands
- `citouch/+/status` — Device online/offline status
- `citouch/+/sync` — Bidirectional state synchronization

## Current State

- ✅ Frontend fully functional (dashboard, fleet, map, alarms, settings, AI playground)
- ✅ Backend API fully functional (CRUD, stats, auth, AI analysis, settings)
- ✅ **AI Data Playground**: Gemini 2.0 Flash integration with 4 expert roles
- ✅ **Hybrid Chart Generation**: Charts from both SQL queries and Google Search data
- ✅ **Auto Role Detection**: Keyword-based routing to the right AI expert
- ✅ MQTT real-time control implemented and working
- ✅ Dark/Light theme support complete
- ✅ Sidebar has auto-hide/auto-show feature

## What Needs Work (Roadmap)

1. **Data Export**: CSV/Excel export from tables and charts
2. **Alarm Rules Engine**: More sophisticated rule-based alarm triggering
3. **User Management**: Multi-tenant support, role-based access control
4. **Saved Analysis Workspaces**: Save and share analysis sessions
5. **Mobile Responsive**: Currently optimized for desktop, needs mobile breakpoints
6. **Testing**: Add unit tests (Jest for frontend, pytest for backend)

## How to Run

```bash
# Frontend only (for UI work)
cd frontend && npm install && npm run dev

# Full stack (needs Docker)
docker compose up -d

# Backend only (needs Python venv)
cd backend && pip install -r requirements.txt && python main.py
```

## File Naming Conventions

- Pages: `app/{route}/page.tsx`
- Components: PascalCase (`AddDeviceModal.tsx`, `Sidebar.tsx`)
- Utilities: camelCase (`iot-api.ts`, `auth.ts`)
- API routes: snake_case (`backend/app/api/stats.py`)

## Tips for Agents

- Always check `LayoutWrapper.tsx` dashboardRoutes when adding new pages
- The frontend API base URL is configured in `iot-api.ts` (currently `http://localhost:8000/api/v1`)
- When modifying Sidebar, note it has auto-collapse behavior with hover detection
- Kandang detail page is the most complex page — it has tabs, product-type-based dynamic UI, MQTT controls
- The `globals.css` uses Tailwind `@apply` directives heavily for component classes
- **AI roles prompts** in `ai_roles.py` are long and structured — read the full prompt before modifying
- **Business Expert** prompt must instruct Gemini to return structured JSON with `data`, `chart_type`, `x_key`, `y_keys`
- The `analysis_service.py` `ask()` method has two data paths (SQL and Search) — changes must handle both
- `ROLE_DETECTION_KEYWORDS` determines auto-routing — test with `role_id: "auto"` after changes
- Settings page stores Gemini API key in DB — check `app_settings` table if AI features don't work
- See `docs/FARM_DATA_ANALYSIS_PLAYGROUND.md` for full AI playground documentation
