from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import events, dashboard, insights, users

settings = get_settings()

app = FastAPI(
    title="devmonitor·AI API",
    description="Gobierno y control del uso de IA en desarrollo",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin, "http://localhost:3000"],
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
    return {"message": "devmonitor·AI API — ver /docs para la documentación"}
