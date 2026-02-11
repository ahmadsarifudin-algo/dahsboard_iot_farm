# 🐔 IoT Data Center Dashboard

> Real-time monitoring and control platform for distributed IoT devices in poultry farming operations.

![Next.js](https://img.shields.io/badge/Next.js-14.1-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)
![MQTT](https://img.shields.io/badge/MQTT-EMQX_5.4-green?logo=eclipse-mosquitto)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Scripts & Tools](#scripts--tools)
- [Contributing](#contributing)

---

## Overview

IoT Data Center Dashboard is a full-stack platform for managing poultry farm operations. It connects to hardware controllers (CiTouch devices) via MQTT to provide real-time monitoring of temperature, humidity, and other environmental parameters across multiple farm locations (kandang).

The platform supports multi-floor, multi-device configurations with different product types (broiler, layer, breeder) and farm house types (close house, open house, etc.).

---

## Features

### 🖥️ Dashboard & Monitoring
- **Overview Page** — Real-time stats with KPI cards, charts, and alerts summary
- **Interactive Map** — Geographic view of all farm locations with Leaflet
- **Live Telemetry** — Temperature, humidity, ammonia, wind speed monitoring via MQTT WebSocket

### 🏠 Fleet Management
- **Kandang (Sites)** — CRUD operations for farm houses with multi-floor support
- **Device Management** — Register, monitor, and control IoT devices
- **Product Configuration** — Dynamic UI based on device type (CiTouch Lite V3, V2, Diesel, etc.)

### ⚡ Device Control
- **Real-time Control** — Send commands to devices via MQTT (fan, heater, cooling pad, inlet)
- **Sync State** — Bidirectional state sync between dashboard and physical devices
- **Alarm Management** — Configure and monitor device alarms with rule-based triggers

### 🤖 AI Data Playground
- **Multi-Expert AI System** — 4 specialized roles: Data Analyst 📊, Farm Expert 🐔, Disease Expert 🦠, Business Expert 💰
- **Natural Language Queries** — Ask questions about farm data in Bahasa Indonesia
- **Auto Role Detection** — Automatically routes questions to the right expert
- **Auto Visualization** — AI generates charts, tables, and insight cards
- **Real-time Market Data** — Business Expert uses Google Search for live market prices
- **Hybrid Chart Generation** — Charts from both SQL queries and web search results
- **SQL Preview** — View generated SQL queries for transparency

### 🎨 UI/UX
- **Dark/Light Mode** — Full theme support with system preference detection
- **Responsive Layout** — Auto-hide sidebar, collapsible navigation
- **Smooth Animations** — Fade-in, slide-up transitions throughout

---

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│   Frontend   │◄──►│   Backend    │◄──►│   TimescaleDB    │
│  (Next.js)   │    │  (FastAPI)   │    │  (PostgreSQL)    │
│  Port: 3000  │    │  Port: 8000  │    │  Port: 5432      │
└──────┬───────┘    └──────┬───────┘    └──────────────────┘
       │                   │
       │ WebSocket         │ aiomqtt
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  MQTT (WS)   │◄──►│  EMQX MQTT   │◄──► IoT Devices
│  Port: 8083  │    │  Port: 1883  │     (CiTouch)
└──────────────┘    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │    Redis     │
                    │  Port: 6379  │
                    └──────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.1 | React framework with App Router |
| TypeScript | 5.3 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Recharts | 2.10 | Data visualization & charts |
| React Leaflet | 4.2 | Interactive maps |
| Lucide React | 0.312 | Icon library |
| Zustand | 4.5 | State management |
| MQTT.js | 5.14 | MQTT over WebSocket |
| clsx | 2.1 | Conditional classnames |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.109 | Async REST API |
| SQLAlchemy | 2.0 | ORM with async support |
| asyncpg | 0.29 | PostgreSQL async driver |
| aiomqtt | 2.0 | MQTT client |
| Pydantic | 2.5 | Data validation |
| python-jose | 3.3 | JWT authentication |
| Alembic | 1.13 | Database migrations |

### Infrastructure
| Service | Image | Purpose |
|---------|-------|---------|
| TimescaleDB | timescale/timescaledb:latest-pg15 | Time-series database |
| EMQX | emqx/emqx:5.4.0 | MQTT broker |
| Redis | redis:7-alpine | Cache & pub/sub |

---

## Prerequisites

Ensure the following are installed on your system:

| Software | Version | Required | Check Command |
|----------|---------|----------|---------------|
| Node.js | 18 LTS+ | ✅ | `node --version` |
| npm | 9+ | ✅ | `npm --version` |
| Python | 3.11+ | ✅ (for backend) | `python --version` |
| pip | latest | ✅ (for backend) | `pip --version` |
| Docker | 20+ | ⚡ Recommended | `docker --version` |
| Docker Compose | 2.0+ | ⚡ Recommended | `docker compose version` |
| Git | latest | ✅ | `git --version` |

---

## Quick Start

### Option 1: Docker Compose (Recommended)

Spin up the entire stack with one command:

```bash
# Clone the repository
git clone https://github.com/your-username/dashboard-iot.git
cd dashboard-iot

# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# Check status
docker compose ps
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/docs
- **EMQX Dashboard**: http://localhost:18083 (admin/public)

### Option 2: Frontend Only (Development)

If you just want to run the frontend for UI development:

```bash
cd dashboard-iot/frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open http://localhost:3000

> **Note**: Without the backend running, API calls will show connection errors. The frontend UI and navigation will still work.

---

## Manual Setup

### 1. Infrastructure Services

```bash
# Start only database, Redis, and MQTT
docker compose up -d timescaledb redis emqx
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run the backend
python main.py
```

Backend will be available at http://localhost:8000

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Or build for production
npm run build
npm start
```

Frontend will be available at http://localhost:3000

---

## Project Structure

```
dashboard-iot/
├── frontend/                    # Next.js 14 Frontend
│   ├── app/                     # App Router pages
│   │   ├── page.tsx             #   Overview dashboard
│   │   ├── layout.tsx           #   Root layout with providers
│   │   ├── globals.css          #   Global styles & Tailwind
│   │   ├── login/               #   Authentication page
│   │   ├── analysis/            #   AI Data Playground
│   │   ├── alarms/              #   Alarm management
│   │   ├── fleet/               #   Fleet management
│   │   │   ├── page.tsx         #     Device list
│   │   │   └── kandang/         #     Kandang (site) management
│   │   │       ├── page.tsx     #       Kandang list
│   │   │       └── [id]/        #       Kandang detail (tabs)
│   │   ├── map/                 #   Geographic map view
│   │   ├── settings/            #   App settings
│   │   └── devices/             #   Device management
│   ├── components/              # Reusable components
│   │   ├── layout/              #   Sidebar, Header, LayoutWrapper
│   │   └── fleet/               #   Fleet-specific components
│   ├── lib/                     # Utilities & services
│   │   ├── iot-api.ts           #   API client (Axios-like)
│   │   ├── auth.ts              #   Auth service
│   │   ├── theme.tsx            #   Theme provider (dark/light)
│   │   └── AuthContext.tsx      #   Auth React context
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── api/                 #   API route handlers
│   │   ├── core/                #   Config, security, database
│   │   ├── models/              #   SQLAlchemy models
│   │   ├── schemas/             #   Pydantic schemas
│   │   └── services/            #   Business logic & MQTT
│   ├── main.py                  #   Entry point
│   ├── requirements.txt
│   └── Dockerfile
│
├── database/                    # Database scripts
│   └── init.sql                 #   Schema initialization
│
├── docker/                      # Docker configurations
├── docs/                        # Documentation
│   ├── IOT_API.md               #   API reference
│   ├── AUTH_API.md              #   Auth API docs
│   ├── MQTT_TOPICS_COMPLETE.md  #   MQTT topic reference
│   ├── ARCHITECTURE.md          #   System architecture
│   └── FARM_DATA_ANALYSIS_PLAYGROUND.md
│
├── docker-compose.yml           # Full stack orchestration
├── .env.example                 # Environment template
├── .gitignore
│
├── simulate-device.js           # Device simulator script
├── test-mqtt.js                 # MQTT connection test
├── test-api-flow.js             # API integration test
├── test-login.js                # Auth flow test
└── test-list-kandang.js         # Kandang API test
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Key Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_DB` | `iot_dashboard` | Database name |
| `POSTGRES_USER` | `iot_user` | Database user |
| `POSTGRES_PASSWORD` | `iot_password` | Database password |
| `REDIS_HOST` | `localhost` | Redis host |
| `MQTT_BROKER_URL` | `mqtt://localhost:1883` | MQTT broker URL |
| `JWT_SECRET` | *(change this!)* | JWT signing secret |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Frontend API URL |

⚠️ **Never commit `.env` to Git** — it's already in `.gitignore`.

---

## API Documentation

Once the backend is running, interactive API docs are available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User authentication |
| POST | `/api/v1/analysis/ask` | AI-powered data analysis (NL → SQL/Search → Chart) |
| GET | `/api/v1/analysis/roles` | List available AI expert roles |
| GET | `/api/v1/analysis/summary` | Farm data summary |
| GET | `/api/v1/kandang` | List all kandang |
| POST | `/api/v1/kandang` | Create new kandang |
| GET | `/api/v1/kandang/{id}` | Get kandang detail |
| DELETE | `/api/v1/kandang/{id}` | Delete kandang |
| GET | `/api/v1/devices` | List all devices |
| GET | `/api/v1/stats/overview` | Dashboard overview stats |
| GET | `/api/v1/alarms` | List alarms |

For complete API reference, see [`docs/IOT_API.md`](docs/IOT_API.md).
For AI Playground details, see [`docs/FARM_DATA_ANALYSIS_PLAYGROUND.md`](docs/FARM_DATA_ANALYSIS_PLAYGROUND.md).

---

## Scripts & Tools

### Device Simulator

Simulate a CiTouch device sending telemetry via MQTT:

```bash
node simulate-device.js
```

### Test Scripts

```bash
# Test MQTT connection
node test-mqtt.js

# Test API flow (auth → CRUD)
node test-api-flow.js

# Test login
node test-login.js

# Test kandang list API
node test-list-kandang.js

# Test MQTT topic mapper
node test-mqtt-mapper.js
```

### Frontend Commands

```bash
cd frontend

npm run dev      # Development server (hot reload)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

---

## Service Ports Reference

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Frontend | 3000 | HTTP | Next.js web app |
| Backend | 8000 | HTTP | FastAPI REST API |
| TimescaleDB | 5432 | TCP | PostgreSQL database |
| Redis | 6379 | TCP | Cache & pub/sub |
| EMQX MQTT | 1883 | TCP | MQTT broker |
| EMQX WebSocket | 8083 | WS | MQTT over WebSocket |
| EMQX Dashboard | 18083 | HTTP | EMQX admin panel |

---

## Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| EMQX Dashboard | `admin` | `public` |
| PostgreSQL | `iot_user` | `iot_password` |
| App Login | `admin@demo.com` | `admin123` |

> ⚠️ Change all default credentials before deploying to production!

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.
