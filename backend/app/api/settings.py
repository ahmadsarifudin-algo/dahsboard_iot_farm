"""
Settings API — Configure Gemini, database, and other runtime settings.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.app_settings import app_settings, AVAILABLE_MODELS

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    database_url: Optional[str] = None


class TestConnectionRequest(BaseModel):
    api_key: Optional[str] = None
    database_url: Optional[str] = None


@router.get("")
async def get_settings():
    """Get current settings (API key masked)."""
    settings = app_settings.get_masked()
    settings["database_type"] = app_settings.get_database_type()
    settings["available_models"] = AVAILABLE_MODELS
    return settings


@router.put("")
async def update_settings(body: SettingsUpdate):
    """Update settings."""
    updates = body.dict(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No settings to update")

    updated = app_settings.update(updates)
    # Return masked version
    result = app_settings.get_masked()
    result["database_type"] = app_settings.get_database_type()
    result["available_models"] = AVAILABLE_MODELS
    return {"message": "Settings updated successfully", "settings": result}


@router.get("/models")
async def get_available_models():
    """Get list of available Gemini models."""
    return {"models": AVAILABLE_MODELS}


@router.post("/test-gemini")
async def test_gemini_connection(body: TestConnectionRequest):
    """Test Gemini API key validity."""
    api_key = body.api_key or app_settings.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="No API key provided")

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(app_settings.get("gemini_model", "gemini-2.0-flash"))
        response = model.generate_content("Say 'connected' in one word")
        return {
            "status": "success",
            "message": "Gemini API connected successfully",
            "response": response.text[:100],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gemini connection failed: {str(e)}")


@router.post("/test-db")
async def test_database_connection(body: TestConnectionRequest):
    """Test database connection with provided URL."""
    db_url = body.database_url or app_settings.get("database_url")
    if not db_url:
        raise HTTPException(status_code=400, detail="No database URL provided")

    try:
        from sqlalchemy.ext.asyncio import create_async_engine

        kwargs = {}
        if "sqlite" in db_url:
            kwargs["connect_args"] = {"check_same_thread": False}

        engine = create_async_engine(db_url, **kwargs)
        async with engine.connect() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
        await engine.dispose()

        db_type = "SQLite" if "sqlite" in db_url else "PostgreSQL" if "postgres" in db_url else "Unknown"
        return {
            "status": "success",
            "message": f"Database connected successfully ({db_type})",
            "database_type": db_type.lower(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database connection failed: {str(e)}")
