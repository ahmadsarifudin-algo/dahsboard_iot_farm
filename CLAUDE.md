# Claude Code Project Instructions

> Instructions for Claude Code (Anthropic) when working on this project.
> For full context see AGENTS.md in the project root.

## Project Overview

Full-stack IoT monitoring dashboard for poultry farms with AI-powered data analysis.
- Frontend: Next.js 14 + TypeScript + Tailwind CSS (port 3000)
- Backend: FastAPI + SQLAlchemy async (port 8000)
- AI Engine: Google Gemini 2.0 Flash (multi-role, search grounding)
- MQTT: EMQX broker (port 1883, WebSocket 8083)
- Database: TimescaleDB/PostgreSQL (port 5432) / SQLite (dev fallback)

## Key Rules

1. Use TypeScript for all frontend code (`.tsx` for components, `.ts` for utilities)
2. Use Tailwind CSS with the custom dark theme tokens (`dark-100` to `dark-500`, `primary-400` to `primary-600`)
3. Use `lucide-react` for all icons — no other icon libraries
4. When adding new pages, add the route to `dashboardRoutes` in `frontend/components/layout/LayoutWrapper.tsx`
5. Use the `iotApi` client from `frontend/lib/iot-api.ts` for all API calls
6. Backend routes must be async and use dependency injection for auth (`Depends(get_current_user)`)
7. All database operations must use async SQLAlchemy patterns

## AI Analysis Rules (Critical)

8. AI role prompts are in `backend/app/services/ai_roles.py` — read the full role prompt before modifying
9. The **Business Expert** prompt must instruct Gemini to return structured JSON with `data`, `chart_type`, `x_key`, `y_keys` fields
10. `analysis_service.py` has **two data paths** in `ask()`: SQL-based (local DB) and Search-based (Google Search) — changes must handle both
11. After modifying `ROLE_DETECTION_KEYWORDS`, always test with `role_id: "auto"` to ensure correct routing
12. Gemini API key is stored in `app_settings` DB table (not .env) — managed via Settings page
13. Search grounding is enabled only for roles with `uses_search: True` (currently only `business_expert`)

## Running the Project

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt && python main.py

# Full stack
docker compose up -d
```

## Important Files

### Frontend
- `frontend/components/layout/LayoutWrapper.tsx` — Controls dashboard layout routing
- `frontend/components/layout/Sidebar.tsx` — Auto-hide/show sidebar with hover
- `frontend/lib/iot-api.ts` — API client with all endpoint methods
- `frontend/lib/auth.ts` — Auth service (JWT in localStorage)
- `frontend/app/globals.css` — Global styles, Tailwind component classes
- `frontend/app/analysis/page.tsx` — **AI Data Playground** (chat + ChartView + DataTable + InsightCards)
- `frontend/tailwind.config.js` — Custom theme colors and configuration

### Backend
- `backend/main.py` — FastAPI entry point
- `backend/app/services/analysis_service.py` — **Core AI analysis engine** (ask, generate_response, chart building)
- `backend/app/services/ai_roles.py` — **AI role definitions**, system prompts, keyword detection
- `backend/app/api/analysis.py` — Analysis route handlers
- `backend/app/api/settings.py` — Runtime settings (Gemini API key, model config)

### Documentation
- `docs/FARM_DATA_ANALYSIS_PLAYGROUND.md` — Full AI playground architecture & API reference
- `docs/IOT_API.md` — IoT REST API reference
- `docs/MQTT_TOPICS_COMPLETE.md` — MQTT topic patterns

## Common Tasks

### Adding a new AI role
1. Define `ROLE_XXX` dict in `ai_roles.py` with `name`, `icon`, `system_prompt`, `uses_search`, etc.
2. Add to `ROLES` registry dict
3. Add keywords to `ROLE_DETECTION_KEYWORDS`
4. Test with `POST /api/v1/analysis/ask` using both `role_id: "your_role"` and `role_id: "auto"`

### Adding a new page
1. Create `frontend/app/{route}/page.tsx`
2. Add route to `dashboardRoutes` in `LayoutWrapper.tsx`
3. Add navigation item to `Sidebar.tsx`

### Modifying chart behavior
1. Backend chart config: `analysis_service.py` → search for `chart_config`
2. Frontend rendering: `analysis/page.tsx` → `ChartView` component
3. Supported types: `line`, `bar`, `area`
