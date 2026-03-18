# External Auth API Reference

Dokumen ini menjelaskan service auth eksternal yang dipakai frontend saat ini melalui `frontend/lib/auth.ts`.

## Scope

Ini bukan endpoint FastAPI lokal.

- Service: `https://auth.chickinindonesia.com`
- Konsumen saat ini: halaman login dan context auth di frontend
- File terkait: `frontend/lib/auth.ts`, `frontend/app/login/page.tsx`, `frontend/lib/AuthContext.tsx`

## Endpoints Used by Frontend

### Login

- Method: `POST`
- URL: `/auth/v1/login`
- Auth format: `Authorization: Basic base64(identifier:password)`
- Body:

```json
{
  "method": "Email"
}
```

`method` dapat berupa `Email`, `Username`, atau `Phone`.

### Logout

- Method: `POST`
- URL: `/auth/v1/logout`
- Header: `Authorization: Bearer <token>`

### Get Current User

- Method: `PUT`
- URL: `/api/users/me`
- Header: `Authorization: Bearer <token>`

## Notes

- Frontend menyimpan token di `localStorage` dengan key `auth_token`.
- Frontend melakukan decode JWT di sisi client untuk mengambil profil user.
- Backend lokal memiliki dependency JWT, tetapi belum ada router `/api/v1/auth/...`.
- Jika tujuan Anda adalah membuat stack lokal mandiri, integrasi auth perlu dipindahkan dari service eksternal ke backend lokal.

## Example

```javascript
const basicAuth = btoa("email@example.com:password123");

fetch("https://auth.chickinindonesia.com/auth/v1/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Basic ${basicAuth}`
  },
  body: JSON.stringify({ method: "Email" })
});
```
