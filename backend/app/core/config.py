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
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./nbs.db")
    app_secret: str = os.getenv("APP_SECRET", "change-this-secret")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    allowed_origins: tuple[str, ...] = ("http://localhost:3000",)
    admin_email: str = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_password: str = os.getenv("ADMIN_PASSWORD", "")


settings = Settings()
