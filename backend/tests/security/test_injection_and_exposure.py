from __future__ import annotations

import pytest

from app.services.geo_layer_service import _safe_identifier

pytestmark = pytest.mark.security

SQLI_PAYLOADS = [
    "' OR '1'='1",
    "admin@example.com' --",
    "'; DROP TABLE users; --",
    "\" OR 1=1 --",
]


@pytest.mark.parametrize("payload", SQLI_PAYLOADS)
def test_login_email_field_is_not_vulnerable_to_sql_injection(client, admin_user, payload):
    response = client.post("/auth/login", json={"email": payload if "@" in payload else f"{payload}@example.com", "password": "irrelevant"})
    # SQLAlchemy's parameterized queries mean an injection payload is just
    # treated as a literal (non-matching) email -- never a bypass.
    assert response.status_code in (401, 422)


@pytest.mark.parametrize("payload", SQLI_PAYLOADS)
def test_geo_layer_table_identifier_rejects_injection_payloads(payload):
    with pytest.raises(ValueError):
        _safe_identifier(payload)


def test_location_tag_injection_attempt_is_rejected(client, admin_headers, tmp_path):
    from app.core.config import settings

    object.__setattr__(settings, "upload_dir", str(tmp_path))
    files = {"file": ("layer.geojson", b'{"type": "FeatureCollection", "features": []}', "application/geo+json")}
    response = client.post(
        "/admin/geo-layers/vector",
        data={"title": "Bad layer", "location_tag": "chiang-rai'; DROP TABLE geo_layers; --"},
        files=files,
        headers=admin_headers,
    )
    assert response.status_code == 422


def test_create_user_response_never_contains_raw_password(client, admin_headers):
    payload = {"full_name": "Secret Agent", "email": "agent@example.com", "password": "top-secret-pw", "role": "user"}
    response = client.post("/admin/users", json=payload, headers=admin_headers)
    assert response.status_code == 201
    assert "top-secret-pw" not in response.text


def test_api_key_secret_is_only_ever_returned_once(client, admin_headers):
    created = client.post("/admin/api-keys", headers=admin_headers).json()
    secret = created["api_key"]

    listing = client.get("/admin/api-keys", headers=admin_headers)
    assert secret not in listing.text
