from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str


class UserAdminOut(UserResponse):
    is_active: bool


class UserAdminCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["admin", "user"] = "user"


class UserAdminUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: Literal["admin", "user"] | None = None
    is_active: bool | None = None
