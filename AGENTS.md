# Agent Guidelines — IoT Data Center Dashboard

> This file provides context for AI coding agents (Antigravity, Claude Code, Cursor, Copilot, etc.)
> to understand and continue working on this project effectively.

## Project Summary

This is a **full-stack IoT monitoring dashboard** for poultry farms. It connects to hardware controllers
(CiTouch devices) via MQTT and provides real-time monitoring, device control, fleet management,
and an AI-powered data analysis playground.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS 3.4
- **Backend**: FastAPI (Python 3.11+) + SQLAlchemy 2.0 (async) + asyncpg
- **Database**: TimescaleDB (PostgreSQL 15 with time-series extension)
- **MQTT Broker**: EMQX 5.4 (devices connect via MQTT, frontend via WebSocket on port 8083)
- **Cache**: Redis 7
- **Orchestration**: Docker Compose

## Key Directories

| Path | What it is |
|------|-----------|
| `frontend/` | Next.js app. Run with `cd frontend && npm install && npm run dev` |
| `frontend/app/` | App Router pages — each folder = a route |
| `frontend/components/layout/` | Sidebar, Header, LayoutWrapper (controls which pages get dashboard layout) |
| `frontend/components/fleet/` | Reusable fleet/device components (modals, cards) |
| `frontend/lib/` | API client (`iot-api.ts`), auth (`auth.ts`), theme (`theme.tsx`) |
| `backend/` | FastAPI app. Run with `cd backend && pip install -r requirements.txt && python main.py` |
| `backend/app/api/` | Route handlers (kandang, devices, stats, alarms, auth) |
| `backend/app/models/` | SQLAlchemy models |
| `backend/app/services/` | MQTT service, business logic |
| `docs/` | API docs, MQTT topics, architecture notes |
| `database/init.sql` | Database schema initialization |

## Important Patterns & Conventions

### Frontend

1. **Layout System**: `LayoutWrapper.tsx` uses a route whitelist (`dashboardRoutes`) to decide which pages
   get the Sidebar + Header. When adding new pages, **add the route to this whitelist**.

2. **API Client**: All API calls go through `frontend/lib/iot-api.ts`. It handles auth headers,
   base URL, and error formatting. Use `iotApi.xxx()` methods, don't use raw `fetch`.

3. **Auth Flow**: Login → JWT token stored in localStorage → attached to API calls via `auth.ts`.
   `AuthContext.tsx` provides React context. Pages check `authService.isAuthenticated()` on mount.

4. **MQTT in Frontend**: Direct WebSocket connection to EMQX (port 8083) from browser.
   Used for real-time telemetry display and device control commands.

5. **Styling**: Tailwind CSS with custom dark theme tokens defined in `tailwind.config.js`:
   - `dark-100` through `dark-500` (darkest)
   - `primary-400` through `primary-600`
   - Use `card`, `btn-primary`, `btn-secondary`, `input` utility classes from `globals.css`

6. **Icons**: Lucide React exclusively. Import from `lucide-react`.

7. **Dynamic UI**: Kandang detail page (`fleet/kandang/[id]/page.tsx`) renders different
   tabs/controls based on `productType` from device config. This is a critical pattern.

### Backend

1. **Async Everything**: All DB operations use async SQLAlchemy + asyncpg. All route handlers are `async def`.

2. **Pydantic v2**: Schemas use `model_config = ConfigDict(from_attributes=True)` pattern.

3. **MQTT Mapper**: `backend/app/services/mqtt_mapper.py` maps between MQTT topic/payload format
   and database models. CiTouch devices use a specific binary/JSON protocol.

4. **Auth**: JWT-based. `backend/app/core/security.py` handles token creation/validation.
   Protected routes use `Depends(get_current_user)`.

## Database Models

Key models in `backend/app/models/models.py`:
- `Site` — A kandang (farm house) with address, type, population
- `Device` — An IoT controller attached to a site/floor
- `Telemetry` — Time-series sensor data (temperature, humidity, etc.)
- `Alarm` — Alert rules and triggered alarms
- `Command` — Commands sent to devices (fan, heater, etc.)

## MQTT Topics

Devices use topic pattern: `citouch/{device_id}/{action}`

Key topics documented in `docs/MQTT_TOPICS_COMPLETE.md`:
- `citouch/+/telemetry` — Device publishes sensor data
- `citouch/+/command` — Dashboard publishes control commands
- `citouch/+/status` — Device online/offline status
- `citouch/+/sync` — Bidirectional state synchronization

## Current State & Known Issues

- Frontend is fully functional with all pages implemented
- Backend API is functional for kandang CRUD, device management, auth, and stats
- AI Data Playground (`/analysis`) currently uses **dummy data** — Gemini API integration is planned
- MQTT real-time control is implemented and working
- Dark/Light theme support is complete
- Sidebar has auto-hide/auto-show feature

## What Needs Work (Roadmap)

1. **AI Playground Backend**: Connect to Gemini API for Text-to-SQL, implement read-only DB queries with RBAC
2. **Data Export**: CSV/Excel export from tables and charts
3. **Alarm Rules Engine**: More sophisticated rule-based alarm triggering
4. **User Management**: Multi-tenant support, role-based access control
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
