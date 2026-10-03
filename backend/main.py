"""Point d’entrée de l’API EduVault."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import auth, catalog, documents, notifications


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Vérifie la configuration indispensable au démarrage."""
    settings.validate_supabase()
    yield


app = FastAPI(
    title="EduVault API",
    description="API de recherche, consultation et dépôt de ressources académiques.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentification"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalogue"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])


@app.get("/health", tags=["Santé"])
async def health() -> dict[str, str]:
    """Expose un contrôle de santé sans divulguer de configuration."""
    return {"status": "ok"}