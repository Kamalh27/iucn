from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_bearer_token, get_current_user
from app.core.security import blocklist
from app.db.session import get_db
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_login_response(token: str, user: User) -> LoginResponse:
    return LoginResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
        ),
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    token, user = AuthService(db).login(email=payload.email, password=payload.password)
    return _to_login_response(token, user)


@router.post("/admin/login", response_model=LoginResponse)
def admin_login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    token, user = AuthService(db).login_admin(email=payload.email, password=payload.password)
    return _to_login_response(token, user)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )


@router.post("/logout")
def logout(token: str = Depends(get_bearer_token)) -> dict[str, str]:
    blocklist.revoke(token)
    return {"message": "Logged out"}
