"""Shared fixtures for the CRVA backend test suite.

The full app depends on PostgreSQL/PostGIS in production (see
`app.core.config.Settings.__post_init__`), but none of the ORM models used by
auth/admin/document/geo-layer *listing* endpoints declare PostGIS geometry
columns -- only the raw-SQL vector ingestion path does. That lets the HTTP
test suite run fully in-memory against SQLite, which keeps unit/integration
tests fast and dependency-free. Tests that need real PostGIS behaviour are
marked `@pytest.mark.postgres` and skipped unless `TEST_DATABASE_URL` (a
Postgres/PostGIS DSN) is provided.
"""
from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Disable auto-bootstrap of an admin user from `.env` so importing the app in
# tests never depends on a real database being reachable at import time.
os.environ.setdefault("APP_SECRET", "test-secret-key")
os.environ["ADMIN_EMAIL"] = ""
os.environ["ADMIN_PASSWORD"] = ""

from app.core import security  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402

# `Settings` is a frozen dataclass populated from `os.environ` at import
# time, so the env vars above only take effect on first import. Force the
# values here too, defensively, in case `app.core.config` was imported by
# another test module first.
object.__setattr__(settings, "admin_email", "")
object.__setattr__(settings, "admin_password", "")


@pytest.fixture()
def db_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture()
def db_session(db_engine) -> Generator[Session, None, None]:
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine) -> Generator[TestClient, None, None]:
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    security.blocklist._revoked_tokens.clear()
    try:
        # Intentionally *not* using `with TestClient(app) as c`: entering
        # the lifespan context would run the real `on_startup` handler,
        # which opens a session against `settings.database_url` (Postgres)
        # rather than our overridden SQLite session.
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def make_user(db: Session, *, email: str, password: str, role: str = "user", full_name: str = "Test User", is_active: bool = True) -> User:
    user = User(
        email=email.strip().lower(),
        full_name=full_name,
        role=role,
        password_hash=security.hash_password(password),
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def user_factory(db_session: Session):
    def _factory(**kwargs) -> User:
        return make_user(db_session, **kwargs)

    return _factory


@pytest.fixture()
def admin_user(db_session: Session) -> User:
    return make_user(db_session, email="admin@example.com", password="admin-pass-123", role="admin", full_name="Admin User")


@pytest.fixture()
def regular_user(db_session: Session) -> User:
    return make_user(db_session, email="user@example.com", password="user-pass-123", role="user", full_name="Regular User")


@pytest.fixture()
def admin_token(admin_user: User) -> str:
    return security.create_access_token(user_id=admin_user.id, email=admin_user.email, role=admin_user.role)


@pytest.fixture()
def user_token(regular_user: User) -> str:
    return security.create_access_token(user_id=regular_user.id, email=regular_user.email, role=regular_user.role)


@pytest.fixture()
def admin_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def user_headers(user_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {user_token}"}
