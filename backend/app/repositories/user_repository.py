from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_active_by_email(self, email: str) -> User | None:
        return (
            self.db.query(User)
            .filter(User.email == email, User.is_active.is_(True))
            .first()
        )

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_active_by_id(self, user_id: str) -> User | None:
        return (
            self.db.query(User)
            .filter(User.id == user_id, User.is_active.is_(True))
            .first()
        )

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def list_all(self) -> list[User]:
        return self.db.query(User).order_by(User.full_name.asc()).all()

    def count_active_admins(self) -> int:
        return (
            self.db.query(User)
            .filter(User.role == "admin", User.is_active.is_(True))
            .count()
        )

    def create(self, *, email: str, full_name: str, role: str, password_hash: str) -> User:
        user = User(
            email=email,
            full_name=full_name,
            role=role,
            password_hash=password_hash,
            is_active=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()
