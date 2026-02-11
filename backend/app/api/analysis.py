"""
Analysis API — Multi-role AI-powered farm expert system endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.analysis_service import analysis_service
from app.services.ai_roles import get_all_roles
from app.core.app_settings import app_settings

router = APIRouter(prefix="/analysis", tags=["Analysis"])


class AskRequest(BaseModel):
    message: str
    session_id: Optional[str] = ""
    role_id: Optional[str] = "auto"


@router.get("/roles")
async def list_roles():
    """List all available AI expert roles."""
    return get_all_roles()


@router.post("/ask")
async def ask_analysis(body: AskRequest):
    """
    Ask a question to the AI farm expert.
    Supports auto role detection or manual role selection.
    Returns: answer, analysis, SQL, data, chart, anomalies, follow-ups, and role info.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not app_settings.get("gemini_api_key"):
        raise HTTPException(
            status_code=400,
            detail="Gemini API key not configured. Go to Settings → AI Configuration to add your key."
        )

    try:
        result = await analysis_service.ask(
            body.message,
            body.session_id or "",
            body.role_id or "auto",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/summary")
async def get_farm_summary():
    """Get a quick farm data summary (no Gemini needed)."""
    try:
        return await analysis_service.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{session_id}")
async def clear_memory(session_id: str):
    """Clear conversation memory for a session."""
    analysis_service.memory.clear(session_id)
    return {"message": f"Memory cleared for session {session_id}"}
