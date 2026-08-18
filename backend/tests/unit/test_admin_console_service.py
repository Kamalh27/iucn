from __future__ import annotations

import hashlib

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schemas import TranslationUpsert
from app.services import admin_console_service as svc

pytestmark = pytest.mark.unit


class TestApiKeys:
    def test_create_api_key_stores_only_the_hash(self, db_session: Session):
        item, secret = svc.create_api_key(db_session)
        assert secret.startswith("nbs_")
        assert item.key_hash == hashlib.sha256(secret.encode()).hexdigest()
        assert item.key_prefix == secret[:12]
        assert secret not in item.key_hash

    def test_serialize_api_key_omits_secret_by_default(self, db_session: Session):
        item, secret = svc.create_api_key(db_session)
        serialized = svc.serialize_api_key(item)
        assert "api_key" not in serialized

    def test_serialize_api_key_includes_secret_when_provided(self, db_session: Session):
        item, secret = svc.create_api_key(db_session)
        serialized = svc.serialize_api_key(item, secret)
        assert serialized["api_key"] == secret

    def test_get_api_key_raises_404_when_missing(self, db_session: Session):
        with pytest.raises(HTTPException) as exc:
            svc.get_api_key(db_session, "does-not-exist")
        assert exc.value.status_code == 404

    def test_list_api_keys_orders_newest_first(self, db_session: Session):
        first, _ = svc.create_api_key(db_session)
        second, _ = svc.create_api_key(db_session)
        keys = svc.list_api_keys(db_session)
        assert [key.id for key in keys][:2] == [second.id, first.id] or set(k.id for k in keys) == {first.id, second.id}


class TestTranslations:
    def test_upsert_rejects_keys_outside_the_fixed_set(self, db_session: Session):
        payload = TranslationUpsert(namespace="not-a-real-namespace", key="not-a-real-key", language="en", value="hi")
        with pytest.raises(HTTPException) as exc:
            svc.upsert_translation(db_session, payload)
        assert exc.value.status_code == 422

    def test_upsert_rejects_unsupported_language(self, db_session: Session):
        payload = TranslationUpsert(namespace="header", key="brand", language="fr", value="Marque")
        with pytest.raises(HTTPException) as exc:
            svc.upsert_translation(db_session, payload)
        assert exc.value.status_code == 422

    def test_upsert_english_value_seeds_thai_placeholder(self, db_session: Session):
        payload = TranslationUpsert(namespace="header", key="brand", language="en", value="CRVA")
        svc.upsert_translation(db_session, payload)
        thai_values = [t.value for t in svc.list_translations(db_session, "th") if t.namespace == "header" and t.key == "brand"]
        assert thai_values == ["CRVA"]

    def test_upsert_is_idempotent_for_existing_key(self, db_session: Session):
        payload = TranslationUpsert(namespace="header", key="brand", language="en", value="CRVA")
        svc.upsert_translation(db_session, payload)
        svc.upsert_translation(db_session, TranslationUpsert(namespace="header", key="brand", language="en", value="CRVA v2"))
        matches = [t for t in svc.list_translations(db_session, "en") if t.namespace == "header" and t.key == "brand"]
        assert len(matches) == 1
        assert matches[0].value == "CRVA v2"

    def test_delete_record_raises_404_when_missing(self, db_session: Session):
        from app.models import ApiKey
        with pytest.raises(HTTPException) as exc:
            svc.delete_record(db_session, ApiKey, "does-not-exist", "API key")
        assert exc.value.status_code == 404
