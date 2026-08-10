from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import User
from app.repositories.user_repository import UserRepository
from app.schemas import UserAdminCreate, UserAdminUpdate


class AdminUserService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)

    def list_users(self) -> list[User]:
        return self.user_repository.list_all()

    def create_user(self, payload: UserAdminCreate) -> User:
        email = payload.email.strip().lower()
        full_name = payload.full_name.strip()
        if self.user_repository.get_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        return self.user_repository.create(
            email=email,
            full_name=full_name,
            role=payload.role,
            password_hash=hash_password(payload.password),
        )

    def update_user(self, user_id: str, payload: UserAdminUpdate) -> User:
        user = self.user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if payload.email is not None:
            next_email = payload.email.strip().lower()
            existing = self.user_repository.get_by_email(next_email)
            if existing and existing.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email already exists",
                )
            user.email = next_email

        if payload.full_name is not None:
            user.full_name = payload.full_name.strip()

        next_role = payload.role if payload.role is not None else user.role
        next_active = payload.is_active if payload.is_active is not None else user.is_active
        if user.role == "admin" and (next_role != "admin" or not next_active):
            active_admins = self.user_repository.count_active_admins()
            if user.is_active and active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="At least one active admin must remain",
                )

        if payload.role is not None:
            user.role = payload.role

        if payload.is_active is not None:
            user.is_active = payload.is_active

        if payload.password:
            user.password_hash = hash_password(payload.password)

        return self.user_repository.save(user)

    def delete_user(self, user_id: str) -> None:
        user = self.user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if user.role == "admin" and user.is_active:
            active_admins = self.user_repository.count_active_admins()
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="At least one active admin must remain",
                )

        self.user_repository.delete(user)
