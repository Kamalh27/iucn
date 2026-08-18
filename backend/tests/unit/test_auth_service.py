from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.services.auth_service import AuthService

pytestmark = pytest.mark.unit


@pytest.fixture()
def with_default_admin_env():
    object.__setattr__(settings, "admin_email", "bootstrap-admin@example.com")
    object.__setattr__(settings, "admin_password", "bootstrap-pass-123")
    try:
        yield
    finally:
        object.__setattr__(settings, "admin_email", "")
        object.__setattr__(settings, "admin_password", "")


class TestEnsureDefaultAdmin:
    def test_noop_when_admin_credentials_are_not_configured(self, db_session: Session):
        AuthService(db_session).ensure_default_admin()
        from app.models import User

        assert db_session.query(User).count() == 0

    def test_creates_admin_when_configured_and_missing(self, db_session: Session, with_default_admin_env):
        AuthService(db_session).ensure_default_admin()
        from app.repositories.user_repository import UserRepository

        user = UserRepository(db_session).get_active_by_email("bootstrap-admin@example.com")
        assert user is not None
        assert user.role == "admin"
        assert security.verify_password("bootstrap-pass-123", user.password_hash)

    def test_promotes_existing_user_to_admin_and_syncs_password(self, db_session: Session, with_default_admin_env, user_factory):
        user_factory(email="bootstrap-admin@example.com", password="old-password", role="user", is_active=True)

        AuthService(db_session).ensure_default_admin()

        from app.repositories.user_repository import UserRepository

        user = UserRepository(db_session).get_by_email("bootstrap-admin@example.com")
        assert user.role == "admin"
        assert user.is_active is True
        assert security.verify_password("bootstrap-pass-123", user.password_hash)

    def test_reactivates_existing_but_deactivated_admin_email(self, db_session: Session, with_default_admin_env, user_factory):
        user_factory(email="bootstrap-admin@example.com", password="old-password", role="user", is_active=False)

        AuthService(db_session).ensure_default_admin()

        from app.repositories.user_repository import UserRepository

        user = UserRepository(db_session).get_by_email("bootstrap-admin@example.com")
        assert user.role == "admin"
        assert user.is_active is True
        assert security.verify_password("bootstrap-pass-123", user.password_hash)

    def test_idempotent_when_admin_already_matches_env(self, db_session: Session, with_default_admin_env):
        AuthService(db_session).ensure_default_admin()
        AuthService(db_session).ensure_default_admin()  # should not raise or duplicate

        from app.models import User

        assert db_session.query(User).filter(User.email == "bootstrap-admin@example.com").count() == 1
