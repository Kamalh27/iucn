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


class ApiKeyOut(BaseModel):
    id: str
    key_prefix: str
    scope: str
    is_active: bool
    created_at: str
    last_used_at: str | None = None


class ApiKeyCreateOut(ApiKeyOut):
    api_key: str


class TranslationOut(BaseModel):
    id: str
    namespace: str
    key: str
    language: str
    value: str
    updated_at: str


class TranslationUpsert(BaseModel):
    namespace: str = Field(default="general", min_length=1, max_length=80)
    key: str = Field(min_length=1, max_length=160)
    language: str = Field(min_length=2, max_length=12)
    value: str = Field(default="", max_length=5000)


class DocumentOut(BaseModel):
    id: str
    title: str
    summary: str | None = None
    original_filename: str
    content_type: str | None = None
    size_bytes: int
    created_at: str
