# IoT Data Center Dashboard - Backend

FastAPI backend for IoT device monitoring and control.

## Quick Start

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

## Project Structure
```
backend/
├── main.py                 # FastAPI app entry
├── requirements.txt        # Dependencies
├── app/
│   ├── core/              # Config, database
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── api/               # REST endpoints
│   │   ├── analysis.py    #   AI analysis routes
│   │   ├── market_price.py#   Market price API
│   │   └── settings.py    #   App settings API
│   └── services/          # Business logic
│       ├── analysis_service.py  # AI analysis engine
│       ├── ai_roles.py          # AI role definitions & prompts
│       ├── mqtt_service.py      # MQTT integration
│       └── websocket_service.py # WebSocket handler
```

## AI Analysis Service

The analysis service (`app/services/analysis_service.py`) powers the Data Playground feature.

### AI Roles
4 specialized roles defined in `app/services/ai_roles.py`:

| Role | Search | Data Source |
|------|--------|-------------|
| Data Analyst | ❌ | SQL queries on local IoT database |
| Farm Management | ❌ | SQL + domain knowledge |
| Disease Expert | ❌ | Domain knowledge base |
| Business Expert | ✅ Google Search | Real-time web search for market data |

### Hybrid Chart Generation
The Business Expert uses Google Search grounding to fetch real-time market prices and returns structured JSON data that the frontend renders as interactive charts. The analysis service handles both SQL-based and search-based data paths for chart generation.

See [docs/FARM_DATA_ANALYSIS_PLAYGROUND.md](../docs/FARM_DATA_ANALYSIS_PLAYGROUND.md) for full documentation.

