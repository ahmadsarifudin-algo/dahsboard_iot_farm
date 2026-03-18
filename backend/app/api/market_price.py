"""
Market Price Search API with database persistence.
Migrated from JSON file storage to MarketSearch table.
"""
import json
import re
import time
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import MarketSearch


router = APIRouter(prefix="/market-prices", tags=["market-prices"])

# In-memory cache: {query_hash: {data, timestamp}}
_cache: dict = {}
CACHE_TTL = 1800  # 30 minutes


class SearchRequest(BaseModel):
    query: str


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
    clean = text
    code_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', clean, flags=re.DOTALL)
    if code_block_match:
        clean = code_block_match.group(1).strip()
    else:
        json_match = re.search(r'\{[\s\S]*\}', clean)
        if json_match:
            clean = json_match.group(0).strip()

    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        parsed = {
            "summary": text[:200],
            "items": [{"label": "Hasil Pencarian", "value": text[:500], "detail": "", "trend": "stabil"}]
        }

    return {
        "summary": parsed.get("summary", ""),
        "items": parsed.get("items", []),
        "sources": sources,
    }


def _model_to_record(m: MarketSearch) -> dict:
    """Convert a MarketSearch ORM object to the API response dict."""
    return {
        "id": m.id,
        "query": m.query,
        "category": m.category,
        "summary": m.summary,
        "items": m.items if m.items else [],
        "sources": m.sources if m.sources else [],
        "searched_at": m.searched_at.isoformat() if m.searched_at else None,
    }


# --- API Endpoints ---

@router.post("/search")
async def search_market_prices(req: SearchRequest, db: AsyncSession = Depends(get_db)):
    """Search for market prices using Gemini + Google Search, persist to database."""
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
        result = await _search_with_gemini(query)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    # Persist to database
    record = MarketSearch(
        id=str(uuid4()),
        query=query,
        category=_auto_category(query),
        summary=result["summary"],
        items=result["items"],
        sources=result["sources"],
        searched_at=datetime.utcnow(),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    search_record = _model_to_record(record)

    # Cache the response
    response = {"search": search_record, "cached": False}
    _cache[cache_key] = {"data": {**response, "cached": True}, "timestamp": time.time()}

    return response


@router.get("/history")
async def get_search_history(
    category: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get search history from database, optionally filtered by category."""
    query = select(MarketSearch).order_by(MarketSearch.searched_at.desc())
    if category:
        query = query.where(MarketSearch.category == category)
    query = query.limit(limit)

    result = await db.execute(query)
    searches = [_model_to_record(s) for s in result.scalars().all()]

    # Total count
    count_q = select(func.count(MarketSearch.id))
    if category:
        count_q = count_q.where(MarketSearch.category == category)
    total = (await db.execute(count_q)).scalar() or 0

    # Distinct categories
    cat_q = select(distinct(MarketSearch.category))
    cats = (await db.execute(cat_q)).scalars().all()

    return {
        "searches": searches,
        "total": total,
        "categories": list(cats),
    }


@router.delete("/history/{search_id}")
async def delete_search(search_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a specific search from history."""
    result = await db.execute(select(MarketSearch).where(MarketSearch.id == search_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Search not found")

    await db.delete(record)
    return {"message": "Deleted", "id": search_id}
