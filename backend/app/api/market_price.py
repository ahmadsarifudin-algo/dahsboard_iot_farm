"""Market Price Search API with JSON file storage for historical web search data."""
import json
import uuid
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(prefix="/market-prices", tags=["market-prices"])

# JSON storage path
DATA_DIR = Path(__file__).parent.parent.parent / "data"
SEARCHES_FILE = DATA_DIR / "market_searches.json"

# In-memory cache: {query_hash: {data, timestamp}}
_cache: dict = {}
CACHE_TTL = 1800  # 30 minutes


class SearchRequest(BaseModel):
    query: str


class DeleteRequest(BaseModel):
    search_id: str


# --- JSON File Storage ---

def _ensure_data_dir():
    """Ensure the data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not SEARCHES_FILE.exists():
        SEARCHES_FILE.write_text(json.dumps({"searches": []}, indent=2), encoding="utf-8")


def _load_searches() -> dict:
    """Load all searches from JSON file."""
    _ensure_data_dir()
    try:
        return json.loads(SEARCHES_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return {"searches": []}


def _save_searches(data: dict):
    """Save searches to JSON file."""
    _ensure_data_dir()
    SEARCHES_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _auto_category(query: str) -> str:
    """Auto-detect category from query text."""
    q = query.lower()
    categories = {
        "ayam_broiler": ["ayam broiler", "broiler", "ayam potong", "ayam hidup"],
        "doc": ["doc", "day old chick", "bibit ayam", "anak ayam"],
        "pakan": ["pakan", "jagung", "konsentrat", "feed", "dedak"],
        "telur": ["telur", "egg"],
        "daging": ["daging", "karkas"],
        "obat_vitamin": ["obat", "vitamin", "vaksin", "antibiotik"],
    }
    for cat, keywords in categories.items():
        if any(kw in q for kw in keywords):
            return cat
    return "lainnya"


# --- Gemini Search Grounding ---

async def _search_with_gemini(query: str) -> dict:
    """Call Gemini with Google Search to get structured market data."""
    from google import genai
    from google.genai import types
    from app.core.app_settings import app_settings

    api_key = app_settings.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key not configured")

    model_name = app_settings.get("gemini_model", "gemini-2.0-flash")
    client = genai.Client(api_key=api_key)

    prompt = f"""Cari informasi terbaru tentang: {query}

Berikan jawaban dalam format JSON STRICT (tanpa markdown, tanpa backtick, hanya JSON murni):
{{
  "summary": "Ringkasan singkat hasil pencarian (1-2 kalimat)",
  "items": [
    {{
      "label": "Nama item/komoditas",
      "value": "Harga atau nilai (contoh: Rp 25.000/kg)",
      "detail": "Detail tambahan (wilayah, keterangan)",
      "trend": "naik/turun/stabil"
    }}
  ]
}}

Pastikan:
- Minimal 2-3 items jika tersedia
- Harga dalam format Rupiah
- trend harus salah satu dari: naik, turun, stabil
- Gunakan data terbaru yang ditemukan
"""

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )

    text = response.text.strip() if response.text else ""

    # Extract grounding sources
    sources = []
    if response.candidates:
        candidate = response.candidates[0]
        gm = getattr(candidate, 'grounding_metadata', None)
        if gm:
            chunks = getattr(gm, 'grounding_chunks', None) or []
            for chunk in chunks:
                web = getattr(chunk, 'web', None)
                if web:
                    sources.append({
                        "title": getattr(web, 'title', '') or '',
                        "uri": getattr(web, 'uri', '') or '',
                    })

    # Parse JSON from response
    # Strip markdown code blocks if present
    clean = text

    # Try to extract JSON from markdown code block first
    code_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', clean, flags=re.DOTALL)
    if code_block_match:
        clean = code_block_match.group(1).strip()
    else:
        # Try to find raw JSON object in the text
        json_match = re.search(r'\{[\s\S]*\}', clean)
        if json_match:
            clean = json_match.group(0).strip()

    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        # If parsing fails, wrap the raw text as a single item
        parsed = {
            "summary": text[:200],
            "items": [{"label": "Hasil Pencarian", "value": text[:500], "detail": "", "trend": "stabil"}]
        }

    return {
        "summary": parsed.get("summary", ""),
        "items": parsed.get("items", []),
        "sources": sources,
    }


# --- API Endpoints ---

@router.post("/search")
async def search_market_prices(req: SearchRequest):
    """Search for market prices using Gemini + Google Search, save to JSON history."""
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Check cache first
    cache_key = query.lower()
    if cache_key in _cache:
        cached = _cache[cache_key]
        if time.time() - cached["timestamp"] < CACHE_TTL:
            return cached["data"]

    try:
        # Call Gemini with search grounding
        result = await _search_with_gemini(query)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    # Build search record
    search_record = {
        "id": str(uuid.uuid4())[:8],
        "query": query,
        "category": _auto_category(query),
        "summary": result["summary"],
        "items": result["items"],
        "sources": result["sources"],
        "searched_at": datetime.now().isoformat(),
    }

    # Save to JSON file
    data = _load_searches()
    data["searches"].insert(0, search_record)  # newest first
    # Keep max 200 entries
    data["searches"] = data["searches"][:200]
    _save_searches(data)

    # Cache the response
    response = {
        "search": search_record,
        "cached": False,
    }
    _cache[cache_key] = {"data": {**response, "cached": True}, "timestamp": time.time()}

    return response


@router.get("/history")
async def get_search_history(category: Optional[str] = None, limit: int = 20):
    """Get search history from JSON file, optionally filtered by category."""
    data = _load_searches()
    searches = data.get("searches", [])

    if category:
        searches = [s for s in searches if s.get("category") == category]

    return {
        "searches": searches[:limit],
        "total": len(searches),
        "categories": list(set(s.get("category", "lainnya") for s in data.get("searches", []))),
    }


@router.delete("/history/{search_id}")
async def delete_search(search_id: str):
    """Delete a specific search from history."""
    data = _load_searches()
    original_len = len(data["searches"])
    data["searches"] = [s for s in data["searches"] if s.get("id") != search_id]

    if len(data["searches"]) == original_len:
        raise HTTPException(status_code=404, detail="Search not found")

    _save_searches(data)
    return {"message": "Deleted", "id": search_id}
