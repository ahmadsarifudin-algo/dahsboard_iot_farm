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
    api_v1_prefix: str = "/api/v1"
    
    # Database - PostgreSQL/TimescaleDB
    database_url: str = "postgresql+asyncpg://iot_user:iot_password@localhost:5432/iot_dashboard"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # MQTT - EMQX
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_client_id: str = "iot-backend"
    
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
