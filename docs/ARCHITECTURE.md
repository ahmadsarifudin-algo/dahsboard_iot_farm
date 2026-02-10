# Dashboard IoT - Project Overview

## Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Dashboard UI<br/>React/Vue/Angular]
        WS_CLIENT[WebSocket Client]
        CHARTS[Data Visualization<br/>Charts & Widgets]
    end
    
    subgraph "Backend Layer"
        API[REST API<br/>Express/FastAPI]
        WS_SERVER[WebSocket Server]
        MQTT_CLIENT[MQTT Client]
        AUTH[Authentication<br/>JWT/OAuth]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>User & Device Data)]
        INFLUX[(InfluxDB<br/>Time-Series Data)]
        REDIS[(Redis<br/>Cache & Pub/Sub)]
    end
    
    subgraph "IoT Layer"
        MQTT_BROKER[MQTT Broker<br/>Mosquitto]
        DEVICES[IoT Devices]
    end
    
    UI --> API
    UI --> WS_CLIENT
    WS_CLIENT --> WS_SERVER
    CHARTS --> UI
    
    API --> AUTH
    API --> POSTGRES
    API --> INFLUX
    API --> REDIS
    
    WS_SERVER --> REDIS
    MQTT_CLIENT --> MQTT_BROKER
    MQTT_CLIENT --> INFLUX
    MQTT_CLIENT --> REDIS
    
    DEVICES --> MQTT_BROKER
    
    style UI fill:#4A90E2
    style API fill:#50C878
    style POSTGRES fill:#336791
    style INFLUX fill:#9394FF
    style MQTT_BROKER fill:#660066
