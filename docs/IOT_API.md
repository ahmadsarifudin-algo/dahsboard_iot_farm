# External IoT API Reference

Dokumen ini menjelaskan API eksternal yang masih dipakai frontend melalui `frontend/lib/iot-api.ts`.

## Scope

Ini bukan kontrak backend FastAPI lokal.

- Service: `https://prod-iot.chickinindonesia.com`
- Konsumen saat ini: halaman `fleet/kandang` dan `fleet/kandang/[id]`
- File terkait: `frontend/lib/iot-api.ts`

## Endpoints Used by Frontend

- `GET /api/iot/v2/shed/user`
- `GET /api/iot/v2/flock/{flockId}`
- `GET /api/iot/v3/feature?flockId={flockId}`
- `GET /api/iot/flock/summary/{flockId}`
- `GET /api/v2/log/chart/custom/flock/{flockId}`
- `GET /api/iot/v2/log-activity/flock/{flockId}`
- `POST /api/iot/v2/shed`
- `DELETE /api/iot/v2/shed/{idKandang}`
- `POST /api/iot/v3/flock`
- `DELETE /api/iot/flock/{flockId}`

## Current Validation Status

Status di frontend tidak seragam:

- `GET /api/iot/v2/shed/user` adalah endpoint yang paling jelas dipakai dan didokumentasikan.
- Endpoint lain masih bersifat referensi integrasi; sebagian ditandai pending validation pada dokumen lama.
- Tidak ada adaptor backend lokal yang membungkus endpoint eksternal ini saat ini.

## Notes

- TypeScript types `Kandang` dan `Flock` di `frontend/lib/iot-api.ts` mengikuti bentuk respons service eksternal, bukan model SQLAlchemy lokal.
- `NEXT_PUBLIC_API_URL` tidak mengubah base URL untuk client ini, karena `frontend/lib/iot-api.ts` masih hardcode host eksternal.
- Jika ingin menyatukan stack ke backend lokal, halaman fleet perlu migrasi dari `iot-api.ts` ke API FastAPI lokal atau adaptor server-side.
