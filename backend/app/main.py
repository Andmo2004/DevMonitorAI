from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.rate_limit import limiter
from app.routers import events, dashboard, insights, users

settings = get_settings()

# Configurar logging estructurado al arranque
setup_logging(debug=settings.debug)

app = FastAPI(
    title="Glasstics API",
    description="Gobierno y control del uso de IA en desarrollo",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuración CORS — orígenes gestionados 100% por variables de entorno
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar routers de negocio
app.include_router(events.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health_check():
    """Endpoint de healthcheck para verificar que la API está operativa."""
    return {
        "status": "ok",
        "version": settings.app_version,
        "service": "devmonitor-ai",
    }


@app.get("/", tags=["system"])
async def root():
    return {"message": "Glasstics API — ver /docs para la documentación"}
