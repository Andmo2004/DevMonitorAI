import logging
from pydantic_settings import BaseSettings
from functools import lru_cache

logger = logging.getLogger("devmonitor.config")


class Settings(BaseSettings):
    # Base de datos
    database_url: str = "postgresql+asyncpg://devmonitor:devmonitor_pass@localhost:5432/devmonitor"

    # Seguridad
    devmonitor_api_key: str = "change-me-in-production"

    # CORS — cadena separada por comas, p.ej.: "http://localhost:5173,http://localhost:3000"
    cors_origin: str = "http://localhost:5173"

    # Anthropic
    anthropic_api_key: str = ""

    # App
    debug: bool = True
    app_version: str = "1.0.0"

    @property
    def cors_origins(self) -> list[str]:
        """Parsea cors_origin como lista de orígenes separados por comas."""
        return [origin.strip() for origin in self.cors_origin.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    # Advertencia de seguridad si la API key no fue personalizada
    if s.devmonitor_api_key == "change-me-in-production":
        logger.warning(
            "⚠️  SEGURIDAD: DEVMONITOR_API_KEY tiene su valor por defecto "
            "('change-me-in-production'). Cámbiala antes de exponer la API "
            "fuera del entorno local de desarrollo."
        )
    return s

