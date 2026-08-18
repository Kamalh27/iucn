from __future__ import annotations

import hashlib
import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ApiKey, Translation
from app.schemas import TranslationUpsert

FIXED_TRANSLATION_KEYS = {
    ("nav", "userManagement"), ("nav", "apiKeys"), ("nav", "languageEditor"),
    ("nav", "documents"), ("nav", "geoData"),
    ("admin", "console"), ("admin", "workspace"), ("admin", "manage"),
    ("header", "brand"), ("header", "subtitle"), ("header", "mapViewer"), ("header", "language"),
    ("dashboard", "title"), ("dashboard", "description"), ("dashboard", "openMap"), ("dashboard", "adminLogin"),
    ("map", "location"), ("map", "chiangRai"), ("map", "suratThani"), ("map", "layers"),
    ("map", "cartoLight"), ("map", "cartoDark"), ("map", "imagery"), ("map", "myLocation"),
    ("map", "zoomIn"), ("map", "zoomOut"), ("map", "fullscreen"),
}


def iso(value) -> str | None:
    return value.isoformat() if value else None


def serialize_api_key(item: ApiKey, secret: str | None = None) -> dict:
    result = {
        "id": item.id, "key_prefix": item.key_prefix, "scope": item.scope,
        "is_active": item.is_active, "created_at": iso(item.created_at),
        "last_used_at": iso(item.last_used_at),
    }
    if secret is not None:
        result["api_key"] = secret
    return result


def list_api_keys(db: Session) -> list[ApiKey]:
    return list(db.scalars(select(ApiKey).order_by(ApiKey.created_at.desc())).all())


def create_api_key(db: Session) -> tuple[ApiKey, str]:
    secret = f"nbs_{secrets.token_urlsafe(32)}"
    item = ApiKey(key_prefix=secret[:12], key_hash=hashlib.sha256(secret.encode()).hexdigest())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item, secret


def get_api_key(db: Session, key_id: str) -> ApiKey:
    item = db.get(ApiKey, key_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    return item


def serialize_translation(item: Translation) -> dict:
    return {"id": item.id, "namespace": item.namespace, "key": item.key,
            "language": item.language, "value": item.value, "updated_at": iso(item.updated_at)}


def list_translations(db: Session, language: str | None = None) -> list[Translation]:
    query = select(Translation)
    if language:
        query = query.where(Translation.language == language)
    query = query.order_by(Translation.namespace, Translation.key, Translation.language)
    return list(db.scalars(query).all())


def upsert_translation(db: Session, payload: TranslationUpsert) -> Translation:
    if (payload.namespace, payload.key) not in FIXED_TRANSLATION_KEYS:
        raise HTTPException(status_code=422, detail="This translation key is fixed and cannot be added")
    if payload.language not in {"en", "th"}:
        raise HTTPException(status_code=422, detail="Only English and Thai translations can be edited")
    query = select(Translation).where(
        Translation.namespace == payload.namespace,
        Translation.key == payload.key,
        Translation.language == payload.language,
    )
    item = db.scalar(query)
    if item:
        item.value = payload.value
    else:
        item = Translation(**payload.model_dump())
        db.add(item)
    if payload.language == "en":
        thai = db.scalar(select(Translation).where(Translation.namespace == payload.namespace, Translation.key == payload.key, Translation.language == "th"))
        if not thai:
            db.add(Translation(namespace=payload.namespace, key=payload.key, language="th", value=payload.value))
    db.commit()
    db.refresh(item)
    return item


def delete_record(db: Session, model, record_id: str, label: str) -> None:
    item = db.get(model, record_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
    db.delete(item)
    db.commit()
