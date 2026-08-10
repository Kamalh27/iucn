from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import User
from app.schemas import UserAdminCreate, UserAdminOut, UserAdminUpdate
from app.services.admin_user_service import AdminUserService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
def admin_ping(user: User = Depends(require_admin)) -> dict[str, str]:
    return {"message": f"Welcome admin {user.full_name}"}


def _to_user_out(user: User) -> UserAdminOut:
    return UserAdminOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
    )


@router.get("/users", response_model=list[UserAdminOut])
def list_admin_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserAdminOut]:
    users = AdminUserService(db).list_users()
    return [_to_user_out(user) for user in users]


@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: UserAdminCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserAdminOut:
    user = AdminUserService(db).create_user(payload)
    return _to_user_out(user)


@router.put("/users/{user_id}", response_model=UserAdminOut)
def update_admin_user(
    user_id: str,
    payload: UserAdminUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserAdminOut:
    user = AdminUserService(db).update_user(user_id=user_id, payload=payload)
    return _to_user_out(user)


@router.delete("/users/{user_id}")
def delete_admin_user(
    user_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    AdminUserService(db).delete_user(user_id=user_id)
    return {"message": "User deleted"}
