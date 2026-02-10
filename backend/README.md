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
│   └── services/          # MQTT, WebSocket, Redis
```
