from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String, Text, UniqueConstraint

from app.db.base import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key_prefix = Column(String, nullable=False)
    key_hash = Column(String, nullable=False, unique=True)
    scope = Column(String, nullable=False, default="public")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime, nullable=True)


class Translation(Base):
    __tablename__ = "translations"
    __table_args__ = (UniqueConstraint("namespace", "key", "language", name="uq_translation_key_language"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    namespace = Column(String, nullable=False, default="general")
    key = Column(String, nullable=False)
    language = Column(String, nullable=False)
    value = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
