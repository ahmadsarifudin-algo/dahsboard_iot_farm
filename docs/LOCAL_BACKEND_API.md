# Local FastAPI API

Dokumen ini merangkum endpoint yang benar-benar diimplementasikan oleh backend lokal di folder `backend/`.

## Base URL

```text
http://localhost:8000/api/v1
```

## Root and Health

- `GET /` -> info API
- `GET /health` -> status service
- `GET /docs` -> Swagger UI
- `GET /redoc` -> ReDoc
- `WS /ws` -> WebSocket realtime

## Sites

- `GET /api/v1/sites`
- `GET /api/v1/sites/{site_id}`
- `POST /api/v1/sites`
- `PATCH /api/v1/sites/{site_id}`
- `DELETE /api/v1/sites/{site_id}`
- `GET /api/v1/sites/map/data`

## Devices

- `GET /api/v1/devices`
- `GET /api/v1/devices/types`
- `GET /api/v1/devices/{device_id}`
- `POST /api/v1/devices`
- `PATCH /api/v1/devices/{device_id}`
- `DELETE /api/v1/devices/{device_id}`
- `POST /api/v1/devices/{device_id}/commands`
- `GET /api/v1/devices/{device_id}/commands`

## Telemetry

- `GET /api/v1/telemetry/devices/{device_id}`
- `POST /api/v1/telemetry`
- `GET /api/v1/telemetry/metrics`
- `GET /api/v1/telemetry/latest/{device_id}`

## Alarms

- `GET /api/v1/alarms`
- `GET /api/v1/alarms/summary`
- `GET /api/v1/alarms/{alarm_id}`
- `POST /api/v1/alarms`
- `PATCH /api/v1/alarms/{alarm_id}/acknowledge`
- `PATCH /api/v1/alarms/{alarm_id}/close`
- `DELETE /api/v1/alarms/{alarm_id}`

## Stats

- `GET /api/v1/stats/overview`
- `GET /api/v1/stats/devices/by-type`
- `GET /api/v1/stats/devices/by-site`
- `GET /api/v1/stats/alarms/timeline`

## Analysis

- `GET /api/v1/analysis/roles`
- `POST /api/v1/analysis/ask`
- `GET /api/v1/analysis/summary`
- `DELETE /api/v1/analysis/memory/{session_id}`

## Settings

- `GET /api/v1/settings`
- `PUT /api/v1/settings`
- `GET /api/v1/settings/models`
- `POST /api/v1/settings/test-gemini`
- `POST /api/v1/settings/test-db`

## Market Prices

- `POST /api/v1/market-prices/search`
- `GET /api/v1/market-prices/history`
- `DELETE /api/v1/market-prices/history/{search_id}`

## Not Implemented Locally

Hal berikut sering disebut di dokumen lama, tetapi tidak ada router FastAPI lokalnya saat ini:

- `/api/v1/auth/...`
- `/api/v1/kandang`
- `/api/v1/flock/...`

Untuk area itu, frontend masih memakai service eksternal yang dijelaskan di:

- [AUTH_API.md](./AUTH_API.md)
- [IOT_API.md](./IOT_API.md)
