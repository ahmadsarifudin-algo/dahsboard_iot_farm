# Getting Started with IoT Dashboard

## Prerequisites
- Node.js 18+ or Python 3.9+
- Docker and Docker Compose
- Git

## Quick Start

### 1. Start Infrastructure Services
```bash
# Start all services (PostgreSQL, InfluxDB, Redis, MQTT)
docker-compose up -d

# Verify all services are running
docker-compose ps
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration (optional for development)
```

### 3. Set Up Backend

#### Option A: Node.js
```bash
cd backend
npm init -y
npm install express cors dotenv pg mqtt socket.io jsonwebtoken
npm install --save-dev nodemon

# Create a simple server (see backend/README.md for details)
```

#### Option B: Python
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn python-dotenv psycopg2-binary paho-mqtt
```

### 4. Set Up Frontend
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install recharts socket.io-client axios zustand @mui/material
```

### 5. Run the Application

#### Terminal 1 - Backend
```bash
cd backend
npm run dev  # or: python main.py
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### 6. Access the Dashboard
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- InfluxDB UI: http://localhost:8086

## Development Workflow

1. **Review the ROLE.md** - Understand your responsibilities as a full-stack developer
2. **Check ARCHITECTURE.md** - Understand the system architecture
3. **Follow the role guidelines** - Maintain code quality and testing standards
4. **Document your work** - Keep API docs and component docs updated

## Testing MQTT

You can test MQTT connectivity using mosquitto clients:

```bash
# Subscribe to a topic
docker exec -it iot-mosquitto mosquitto_sub -t "devices/+/telemetry"

# Publish a test message
docker exec -it iot-mosquitto mosquitto_pub -t "devices/test-device/telemetry" -m '{"temperature": 25.5, "humidity": 60}'
```

## Stopping Services

```bash
# Stop all Docker services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Next Steps

1. Design your database schema (see `database/` directory)
2. Implement authentication endpoints
3. Create device management APIs
4. Build the dashboard UI
5. Integrate real-time data visualization
6. Set up MQTT device communication

## Troubleshooting

### Port Conflicts
If you get port conflict errors, check if services are already running:
```bash
# Windows
netstat -ano | findstr :5432
netstat -ano | findstr :8086

# Stop conflicting processes or change ports in docker-compose.yml
```

### Docker Issues
```bash
# Restart Docker services
docker-compose restart

# View logs
docker-compose logs -f [service-name]
```

## Resources
- [ROLE.md](./ROLE.md) - Your role definition
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [Frontend README](./frontend/README.md) - Frontend setup
- [Backend README](./backend/README.md) - Backend setup
