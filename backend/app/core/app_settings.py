"""
Application Settings Manager.
Reads/writes runtime-configurable settings to a JSON file.
These are separate from env-based config (config.py) — they can be changed
from the Settings UI at runtime.
"""
import json
import os
from pathlib import Path
from typing import Optional


SETTINGS_FILE = Path(__file__).parent.parent.parent / "settings.json"

DEFAULT_SETTINGS = {
    "gemini_api_key": "",
    "gemini_model": "gemini-2.0-flash",
    "database_url": "sqlite+aiosqlite:///./iot_dashboard.db",
}

AVAILABLE_MODELS = [
    {"value": "gemini-2.0-flash", "label": "Gemini 2.0 Flash (Recommended)"},
    {"value": "gemini-2.0-flash-lite", "label": "Gemini 2.0 Flash Lite"},
    {"value": "gemini-1.5-pro", "label": "Gemini 1.5 Pro"},
    {"value": "gemini-1.5-flash", "label": "Gemini 1.5 Flash"},
]


class AppSettingsManager:
    """Manages runtime-configurable application settings via JSON file."""

    def __init__(self, path: Path = SETTINGS_FILE):
        self._path = path
        self._cache: Optional[dict] = None

    def _load(self) -> dict:
        """Load settings from disk, merging with defaults."""
        settings = dict(DEFAULT_SETTINGS)
        if self._path.exists():
            try:
                with open(self._path, "r", encoding="utf-8") as f:
                    stored = json.load(f)
                settings.update(stored)
            except (json.JSONDecodeError, IOError):
                pass
        self._cache = settings
        return settings

    def get_all(self) -> dict:
        """Return all settings (uses cache if available)."""
        if self._cache is None:
            self._load()
        return dict(self._cache)  # type: ignore

    def get(self, key: str, default=None):
        """Get a single setting value."""
        return self.get_all().get(key, default)

    def update(self, updates: dict) -> dict:
        """Update settings and persist to disk."""
        current = self._load()
        # Only allow known keys
        for key in DEFAULT_SETTINGS:
            if key in updates:
                current[key] = updates[key]

        with open(self._path, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)

        self._cache = current
        return current

    def get_masked(self) -> dict:
        """Return settings with API key partially masked for frontend display."""
        settings = self.get_all()
        key = settings.get("gemini_api_key", "")
        if key and len(key) > 8:
            settings["gemini_api_key"] = key[:4] + "•" * (len(key) - 8) + key[-4:]
        elif key:
            settings["gemini_api_key"] = "•" * len(key)
        settings["gemini_api_key_set"] = bool(self.get("gemini_api_key"))
        return settings

    def get_database_type(self) -> str:
        """Detect database type from URL."""
        url = self.get("database_url", "")
        if "sqlite" in url:
            return "sqlite"
        elif "postgresql" in url or "postgres" in url:
            return "postgresql"
        elif "mysql" in url:
            return "mysql"
        return "unknown"

    def invalidate_cache(self):
        """Clear cached settings to force reload from disk."""
        self._cache = None


# Global singleton
app_settings = AppSettingsManager()
