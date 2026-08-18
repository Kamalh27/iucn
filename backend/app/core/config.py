from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env explicitly so credentials are controlled in environment config.
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_PATH)


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/nbs")
    app_secret: str = os.getenv("APP_SECRET", "change-this-secret")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    allowed_origins: tuple[str, ...] = ("http://localhost:3000",)
    admin_email: str = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_password: str = os.getenv("ADMIN_PASSWORD", "")
    upload_dir: str = os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parents[2] / "uploads"))
    titiler_url: str = os.getenv("TITILER_URL", "http://localhost:8001")
    titiler_upload_dir: str = os.getenv("TITILER_UPLOAD_DIR", os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parents[2] / "uploads")))
    vector_mvt_threshold_bytes: int = int(os.getenv("VECTOR_MVT_THRESHOLD_BYTES", str(5 * 1024 * 1024)))

    def __post_init__(self) -> None:
        if self.database_url.startswith("sqlite"):
            raise ValueError("SQLite is not supported. Configure DATABASE_URL for PostgreSQL/PostGIS.")


settings = Settings()
