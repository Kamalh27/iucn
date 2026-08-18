from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import admin, auth, health
from app.core.config import settings
from app.db.session import SessionLocal
from app.services.auth_service import AuthService


def create_app() -> FastAPI:
    app = FastAPI(title="CRVA API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        with SessionLocal() as db:
            AuthService(db).ensure_default_admin()

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(admin.public_router)

    return app


app = create_app()
