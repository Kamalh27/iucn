from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.repositories.user_repository import UserRepository


class AuthService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)

    def login(self, *, email: str, password: str) -> tuple[str, User]:
        normalized_email = email.strip().lower()
        user = self.user_repository.get_active_by_email(normalized_email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token(user_id=user.id, email=user.email, role=user.role)
        return token, user

    def login_admin(self, *, email: str, password: str) -> tuple[str, User]:
        token, user = self.login(email=email, password=password)
        if user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return token, user

    def ensure_default_admin(self) -> None:
        if not settings.admin_email or not settings.admin_password:
            return

        existing = self.user_repository.get_active_by_email(settings.admin_email)
        if existing:
            updated = False
            if existing.role != "admin":
                existing.role = "admin"
                updated = True
            if not existing.is_active:
                existing.is_active = True
                updated = True
            if not verify_password(settings.admin_password, existing.password_hash):
                existing.password_hash = hash_password(settings.admin_password)
                updated = True
            if updated:
                self.user_repository.db.commit()
            return

        self.user_repository.create(
            email=settings.admin_email,
            full_name="CRVA Admin",
            role="admin",
            password_hash=hash_password(settings.admin_password),
        )
