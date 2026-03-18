# IoT Data Center Dashboard

Dashboard untuk monitoring dan analisis data IoT peternakan ayam.

## Current State

Arsitektur sedang dalam proses migrasi dari hybrid ke backend lokal konsisten.

- Frontend Next.js berjalan lokal dari folder `frontend/`.
- Backend FastAPI lokal menyediakan API untuk `sites`, `devices`, `telemetry`, `alarms`, `stats`, `analysis`, `settings`, `market-prices`, `coops`, `flocks`, dan `integrations`.
- **Sudah dimigrasikan ke backend adapter**:
  - Auth login/logout/me: `frontend/lib/auth.ts` -> backend adapter `POST /api/v1/integrations/chickin/auth/login`
  - Kandang list: `frontend/lib/iot-api.ts` `getKandangList()` -> `GET /api/v1/integrations/chickin/coops`
  - Flock detail: `frontend/lib/iot-api.ts` `getFlockById()` -> `GET /api/v1/integrations/chickin/flocks/{id}`
  - Market search: `market_price.py` sekarang persist ke database (bukan JSON file)
- **Masih direct ke external Chickin** (belum ada adapter):
  - Device features, flock summary, chart data, activity log, create/delete kandang/flock
  - Browser MQTT: `frontend/lib/mqtt.ts` -> `broker.chickinindonesia.com` (by design)

Progress migrasi lengkap ada di [docs/todo/TASK_BOARD.md](docs/todo/TASK_BOARD.md).

## Tech Stack

- Frontend: Next.js 13.5.6, React 18, TypeScript, Tailwind CSS, Recharts, Zustand
- Backend: FastAPI 0.109, SQLAlchemy 2.0 async, Pydantic 2, Redis, aiomqtt
- Database: SQLite default untuk dev, PostgreSQL/TimescaleDB untuk deployment
- AI: Gemini via endpoint analysis dan market price search
- Infra lokal: Docker Compose untuk TimescaleDB, Redis, backend, dan frontend

## Repository Layout

- `frontend/`: aplikasi Next.js
- `backend/`: aplikasi FastAPI
- `docs/`: dokumentasi arsitektur dan API
- `database/init.sql`: bootstrap schema PostgreSQL/TimescaleDB
- `docker-compose.yml`: stack lokal

## Local Backend API

Base URL backend lokal default:

```text
http://localhost:8000/api/v1
```

Ringkasan endpoint ada di [docs/LOCAL_BACKEND_API.md](docs/LOCAL_BACKEND_API.md).

Endpoint lokal utama:

- `GET /stats/overview`
- `GET /sites`
- `GET /sites/map/data`
- `GET /devices`
- `GET /telemetry/devices/{device_id}`
- `GET /alarms`
- `POST /analysis/ask`
- `GET /analysis/roles`
- `GET /analysis/summary`
- `GET /settings`
- `PUT /settings`
- `POST /market-prices/search`
- `GET /coops`
- `GET /flocks`
- `GET /integrations/external-endpoints`

Chickin adapter endpoints (proxy ke external):

- `POST /integrations/chickin/auth/login`
- `POST /integrations/chickin/auth/logout`
- `GET /integrations/chickin/auth/me`
- `GET /integrations/chickin/coops`
- `GET /integrations/chickin/flocks/{flock_id}`

## External Service References

Dokumen berikut mendeskripsikan service eksternal yang masih dipakai frontend, bukan FastAPI lokal:

- [docs/AUTH_API.md](docs/AUTH_API.md)
- [docs/IOT_API.md](docs/IOT_API.md)

## Quick Start

### Full stack via Docker

```bash
docker compose up -d
```

Endpoint lokal:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### Backend only

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

## Documentation Map

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): arsitektur aktual repo
- [docs/ARCHITECTURE_PLAN.md](docs/ARCHITECTURE_PLAN.md): rencana arsitektur terbaru dan phase implementasi
- [docs/CHICKIN_INTEGRATION_DESIGN.md](docs/CHICKIN_INTEGRATION_DESIGN.md): desain integrasi endpoint Chickin yang sudah valid
- [docs/LOCAL_BACKEND_API.md](docs/LOCAL_BACKEND_API.md): endpoint FastAPI lokal
- [docs/FARM_DATA_ANALYSIS_PLAYGROUND.md](docs/FARM_DATA_ANALYSIS_PLAYGROUND.md): fitur AI analysis
- [docs/todo/TASK_BOARD.md](docs/todo/TASK_BOARD.md): task board implementasi dan migrasi
- [docs/AUTH_API.md](docs/AUTH_API.md): referensi auth eksternal
- [docs/IOT_API.md](docs/IOT_API.md): referensi IoT eksternal
