# Claude Code Project Instructions

> Instructions for Claude Code (Anthropic) when working on this project.
> For full context see AGENTS.md in the project root.

## Project Overview

Full-stack IoT monitoring dashboard for poultry farms.
- Frontend: Next.js 14 + TypeScript + Tailwind CSS (port 3000)
- Backend: FastAPI + SQLAlchemy async (port 8000)
- MQTT: EMQX broker (port 1883, WebSocket 8083)
- Database: TimescaleDB/PostgreSQL (port 5432)

## Key Rules

1. Use TypeScript for all frontend code (`.tsx` for components, `.ts` for utilities)
2. Use Tailwind CSS with the custom dark theme tokens (`dark-100` to `dark-500`, `primary-400` to `primary-600`)
3. Use `lucide-react` for all icons — no other icon libraries
4. When adding new pages, add the route to `dashboardRoutes` in `frontend/components/layout/LayoutWrapper.tsx`
5. Use the `iotApi` client from `frontend/lib/iot-api.ts` for all API calls
6. Backend routes must be async and use dependency injection for auth (`Depends(get_current_user)`)
7. All database operations must use async SQLAlchemy patterns

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

- `frontend/components/layout/LayoutWrapper.tsx` — Controls dashboard layout routing
- `frontend/components/layout/Sidebar.tsx` — Auto-hide/show sidebar with hover
- `frontend/lib/iot-api.ts` — API client with all endpoint methods
- `frontend/lib/auth.ts` — Auth service (JWT in localStorage)
- `frontend/app/globals.css` — Global styles, Tailwind component classes
- `frontend/tailwind.config.js` — Custom theme colors and configuration
- `backend/main.py` — FastAPI entry point
- `docs/` — API docs, MQTT topics, architecture reference
