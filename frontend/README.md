# Frontend

Frontend menggunakan Next.js 13 App Router.

## Important Integration Split

Tidak semua halaman memakai backend yang sama.

- Memakai backend lokal (`NEXT_PUBLIC_API_URL`):
  - dashboard overview
  - map data lokal
  - alarms
  - settings
  - analysis playground

- Masih memakai service eksternal:
  - login via `frontend/lib/auth.ts`
  - kandang/flock via `frontend/lib/iot-api.ts`
  - browser MQTT via external broker in `frontend/lib/mqtt.ts`

## Run

```bash
npm install
npm run dev
```

## Main Files

- `app/page.tsx`: overview dashboard
- `app/analysis/page.tsx`: AI analysis playground
- `app/settings/page.tsx`: runtime settings UI
- `app/fleet/kandang/page.tsx`: kandang list from external IoT API
- `app/fleet/kandang/[id]/page.tsx`: kandang detail with external IoT API plus external MQTT broker
- `lib/api.ts`: client untuk FastAPI lokal
- `lib/iot-api.ts`: client untuk external IoT API
- `lib/auth.ts`: client untuk external auth API
- `lib/mqtt.ts`: browser MQTT client
