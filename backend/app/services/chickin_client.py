"""
HTTP client for Chickin external APIs.
Provides adapter methods for auth, coop, and flock upstream calls with
error mapping, timeout, and response normalization.
"""
import base64
import logging
from typing import Optional
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Default upstream base URLs (can be overridden via ExternalEndpoint registry)
CHICKIN_AUTH_BASE = "https://auth.chickinindonesia.com"
CHICKIN_IOT_BASE = "https://prod-iot.chickinindonesia.com"

# Client timeouts
DEFAULT_TIMEOUT = httpx.Timeout(15.0, connect=5.0)


class ChickinUpstreamError(Exception):
    """Raised when upstream Chickin API returns an error."""

    def __init__(self, status_code: int, detail: str, source: str = "chickin"):
        self.status_code = status_code
        self.detail = detail
        self.source = source
        super().__init__(detail)


def map_upstream_error(status_code: int, body: dict | str, endpoint: str) -> dict:
    """Map upstream HTTP error to a frontend-safe response structure."""
    if status_code == 401:
        return {
            "error": "authentication_failed",
            "detail": "Invalid credentials or expired token",
            "upstream_status": 401,
            "source": "chickin",
        }
    elif status_code == 403:
        return {
            "error": "forbidden",
            "detail": "Access denied by upstream service",
            "upstream_status": 403,
            "source": "chickin",
        }
    elif status_code == 404:
        return {
            "error": "not_found",
            "detail": f"Resource not found on upstream: {endpoint}",
            "upstream_status": 404,
            "source": "chickin",
        }
    elif status_code == 429:
        return {
            "error": "rate_limited",
            "detail": "Upstream rate limit exceeded, retry later",
            "upstream_status": 429,
            "source": "chickin",
        }
    elif status_code >= 500:
        return {
            "error": "upstream_error",
            "detail": "Chickin service is temporarily unavailable",
            "upstream_status": status_code,
            "source": "chickin",
        }
    else:
        detail = body if isinstance(body, str) else body.get("message", str(body))
        return {
            "error": "upstream_error",
            "detail": str(detail)[:500],
            "upstream_status": status_code,
            "source": "chickin",
        }


class ChickinClient:
    """Async HTTP client for Chickin external services."""

    def __init__(
        self,
        auth_base: str | None = None,
        iot_base: str | None = None,
    ):
        settings = get_settings()
        self.auth_base = auth_base or settings.chickin_auth_base_url
        self.iot_base = iot_base or settings.chickin_iot_base_url

    def _make_client(self, base_url: str, token: Optional[str] = None) -> httpx.AsyncClient:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return httpx.AsyncClient(
            base_url=base_url,
            headers=headers,
            timeout=DEFAULT_TIMEOUT,
        )

    # ---- Auth Adapter ----

    async def login(self, identifier: str, password: str, method: str = "Email") -> dict:
        """
        Proxy login to Chickin auth service.
        Returns normalized response: {token, message, user, errors}
        """
        basic_auth = base64.b64encode(f"{identifier}:{password}".encode()).decode()
        async with self._make_client(self.auth_base) as client:
            try:
                resp = await client.post(
                    "/auth/v1/login",
                    headers={"Authorization": f"Basic {basic_auth}"},
                    json={"method": method},
                )
            except httpx.RequestError as exc:
                raise ChickinUpstreamError(
                    502, f"Cannot reach auth service: {exc}", "chickin_auth"
                )

        if resp.status_code >= 400:
            err = map_upstream_error(resp.status_code, resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text, "/auth/v1/login")
            raise ChickinUpstreamError(resp.status_code, err["detail"], err["source"])

        data = resp.json()
        return {
            "token": data.get("data", {}).get("token"),
            "message": data.get("message", "OK"),
            "user": None,
            "errors": data.get("errors"),
        }

    async def logout(self, token: str) -> dict:
        """Proxy logout to Chickin auth service."""
        async with self._make_client(self.auth_base, token=token) as client:
            try:
                resp = await client.post("/auth/v1/logout")
            except httpx.RequestError:
                return {"message": "Logout sent (upstream unreachable)"}
        return {"message": resp.json().get("message", "OK")}

    async def get_me(self, token: str) -> dict:
        """Fetch current user profile from Chickin auth."""
        async with self._make_client(self.auth_base, token=token) as client:
            try:
                resp = await client.put("/api/users/me")
            except httpx.RequestError as exc:
                raise ChickinUpstreamError(502, f"Cannot reach auth service: {exc}", "chickin_auth")

        if resp.status_code >= 400:
            err = map_upstream_error(resp.status_code, resp.text, "/api/users/me")
            raise ChickinUpstreamError(resp.status_code, err["detail"], err["source"])

        data = resp.json()
        return data.get("data", data)

    # ---- Coop/Kandang Adapter ----

    async def get_coops(self, token: str) -> list[dict]:
        """
        Fetch kandang list from Chickin IoT, return normalized coop list.
        Also snapshots to local DB via upsert (caller responsibility).
        """
        async with self._make_client(self.iot_base, token=token) as client:
            try:
                resp = await client.get("/api/iot/v2/shed/user")
            except httpx.RequestError as exc:
                raise ChickinUpstreamError(502, f"Cannot reach IoT service: {exc}", "chickin_iot")

        if resp.status_code >= 400:
            err = map_upstream_error(resp.status_code, resp.text, "/api/iot/v2/shed/user")
            raise ChickinUpstreamError(resp.status_code, err["detail"], err["source"])

        raw = resp.json()
        kandang_list = raw.get("data", [])
        return [self._normalize_coop(k) for k in kandang_list]

    async def get_flock(self, flock_id: str, token: str) -> dict:
        """Fetch single flock detail from Chickin IoT, return normalized."""
        async with self._make_client(self.iot_base, token=token) as client:
            try:
                resp = await client.get(f"/api/iot/v2/flock/{flock_id}")
            except httpx.RequestError as exc:
                raise ChickinUpstreamError(502, f"Cannot reach IoT service: {exc}", "chickin_iot")

        if resp.status_code >= 400:
            err = map_upstream_error(resp.status_code, resp.text, f"/api/iot/v2/flock/{flock_id}")
            raise ChickinUpstreamError(resp.status_code, err["detail"], err["source"])

        raw = resp.json()
        flock_data = raw.get("data", raw)
        return self._normalize_flock(flock_data)

    # ---- Normalization helpers ----

    @staticmethod
    def _normalize_coop(k: dict) -> dict:
        """Normalize upstream kandang payload to local contract."""
        return {
            "external_id": k.get("_id", ""),
            "code": k.get("kode", ""),
            "name": k.get("kode", ""),
            "address": k.get("alamat", ""),
            "coop_type": k.get("tipe", 1),
            "population": k.get("populasi", 0),
            "cultivation_type": k.get("jenisBudidaya", "broiler"),
            "province": k.get("province", ""),
            "regency": k.get("regency", ""),
            "city": k.get("kota", ""),
            "floor_count": k.get("floor_count", 1),
            "flock_count": k.get("flock_count", 0),
            "active": k.get("active", True),
            "fully_paired": k.get("fully_paired", False),
            "is_mandiri": k.get("isMandiri", True),
            "is_distributor": k.get("isDistributor", False),
            "flocks": [
                {
                    "external_id": f.get("_id", ""),
                    "name": f.get("name", ""),
                    "population": f.get("populasi", 0),
                    "connected": f.get("connected", False),
                }
                for f in k.get("flocks", [])
            ],
        }

    @staticmethod
    def _normalize_flock(f: dict) -> dict:
        """Normalize upstream flock payload to local contract."""
        return {
            "external_id": f.get("_id", ""),
            "name": f.get("name", ""),
            "part_number": f.get("partNumber", ""),
            "device_name": f.get("deviceName", ""),
            "type": f.get("type", "Ci-Touch"),
            "type_code": f.get("typeCode"),
            "version": f.get("version", ""),
            "version_code": f.get("versionCode"),
            "mode": f.get("mode", ""),
            "day": f.get("day", 0),
            "population": f.get("populasi", 0),
            "connected": f.get("connected", False),
            "actual_temperature": (f.get("actualTemperature") or 0) / 10 if f.get("actualTemperature") else None,
            "ideal_temperature": (f.get("idealTemperature") or 0) / 10 if f.get("idealTemperature") else None,
            "humidity": f.get("humidity"),
            "hsi": f.get("HSI"),
            "co2": f.get("co2"),
            "ammonia": f.get("amonia"),
            "device_state": f.get("device", {}),
            "target_temperature": f.get("targetTemperature", {}),
            "sensors": f.get("sensors", {}),
            "alarm_config": f.get("alarm", {}),
            "inverter": f.get("inverter", {}),
            "features": f.get("features", {}),
            "coop": {
                "external_id": f["coop"]["_id"],
                "code": f["coop"].get("kode", ""),
                "name": f["coop"].get("kode", ""),
            } if f.get("coop") else None,
        }


# Global singleton
chickin_client = ChickinClient()
