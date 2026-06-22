from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Base de datos
    database_url: str = "postgresql+asyncpg://devmonitor:devmonitor_pass@localhost:5432/devmonitor"

    # Seguridad
    devmonitor_api_key: str = "change-me-in-production"

    # CORS
    cors_origin: str = "http://localhost:5173"

    # Anthropic
    anthropic_api_key: str = ""

    # App
    debug: bool = True
    app_version: str = "1.0.0"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
