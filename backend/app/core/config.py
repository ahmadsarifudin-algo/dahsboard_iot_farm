"""
IoT Data Center Dashboard - Backend Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    app_name: str = "IoT Data Center Dashboard"
    debug: bool = False
    environment: str = "development"  # development, staging, production
    api_v1_prefix: str = "/api/v1"
    
    # Database - SQLite for local dev, PostgreSQL for production
    database_url: str = "sqlite+aiosqlite:///./iot_dashboard.db"
    
    # Redis (optional for local dev)
    redis_url: str = "redis://localhost:6379"
    redis_enabled: bool = False
    
    # MQTT - EMQX (optional for local dev)
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_client_id: str = "iot-backend"
    mqtt_enabled: bool = False
    
    # JWT
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
