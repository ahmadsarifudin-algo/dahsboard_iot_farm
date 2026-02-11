"""
Settings API — Configure Gemini, database, and other runtime settings.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.app_settings import app_settings, AVAILABLE_MODELS
from app.core.database import db_manager

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
    settings["database_url"] = db_manager.current_url
    settings["available_models"] = AVAILABLE_MODELS
    return settings


@router.put("")
async def update_settings(body: SettingsUpdate):
    """Update settings. If database_url changes, hot-swap the database."""
    updates = body.dict(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No settings to update")

    db_swap_result = None

    # Hot-swap database if URL changed
    if "database_url" in updates and updates["database_url"] != db_manager.current_url:
        db_swap_result = await db_manager.swap(updates["database_url"])
        if not db_swap_result["success"]:
            raise HTTPException(
                status_code=400,
                detail=f"Database switch failed: {db_swap_result['message']}. Settings NOT saved."
            )

    # Save all settings to settings.json
    app_settings.update(updates)

    # Return masked version
    result = app_settings.get_masked()
    result["database_type"] = app_settings.get_database_type()
    result["database_url"] = db_manager.current_url
    result["available_models"] = AVAILABLE_MODELS

    message = "Settings updated successfully"
    if db_swap_result:
        message += f". {db_swap_result['message']}"

    return {"message": message, "settings": result}


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
    """Test database connection with provided URL (without switching)."""
    db_url = body.database_url or db_manager.current_url
    if not db_url:
        raise HTTPException(status_code=400, detail="No database URL provided")

    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        import sqlalchemy

        kwargs = {}
        if "sqlite" in db_url:
            kwargs["connect_args"] = {"check_same_thread": False}

        test_engine = create_async_engine(db_url, **kwargs)
        async with test_engine.connect() as conn:
            await conn.execute(sqlalchemy.text("SELECT 1"))
        await test_engine.dispose()

        db_type = "SQLite" if "sqlite" in db_url else "PostgreSQL" if "postgres" in db_url else "Unknown"
        return {
            "status": "success",
            "message": f"Database connected successfully ({db_type})",
            "database_type": db_type.lower(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database connection failed: {str(e)}")
