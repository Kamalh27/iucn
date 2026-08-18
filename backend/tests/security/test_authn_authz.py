from __future__ import annotations

import pytest

from app.core import security

pytestmark = pytest.mark.security

PROTECTED_ADMIN_ROUTES = [
    ("GET", "/admin/ping"),
    ("GET", "/admin/users"),
    ("GET", "/admin/api-keys"),
    ("GET", "/admin/translations"),
    ("GET", "/admin/documents"),
    ("GET", "/admin/geo-layers"),
]


@pytest.mark.parametrize("method, path", PROTECTED_ADMIN_ROUTES)
def test_admin_routes_reject_missing_credentials(client, method, path):
    response = client.request(method, path)
    assert response.status_code == 401


@pytest.mark.parametrize("method, path", PROTECTED_ADMIN_ROUTES)
def test_admin_routes_reject_non_admin_role(client, user_headers, method, path):
    response = client.request(method, path, headers=user_headers)
    assert response.status_code == 403


@pytest.mark.parametrize(
    "bad_header",
    [
        {"Authorization": "Bearer"},  # no token
        {"Authorization": "Bearertoken-without-space"},
        {"Authorization": "Basic dXNlcjpwYXNz"},  # wrong scheme
        {"Authorization": ""},
    ],
)
def test_malformed_authorization_header_is_rejected(client, bad_header):
    response = client.get("/auth/me", headers=bad_header)
    assert response.status_code == 401


def test_junk_bearer_token_is_rejected(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_token_for_deleted_user_is_rejected(client, admin_headers, admin_user, db_session):
    # Even a structurally valid, correctly-signed token must stop working
    # once the underlying account is deactivated.
    admin_user.is_active = False
    db_session.commit()
    response = client.get("/auth/me", headers=admin_headers)
    assert response.status_code == 401


def test_expired_token_cannot_authenticate(client, regular_user):
    import time

    expired_token = security.create_access_token(user_id=regular_user.id, email=regular_user.email, role=regular_user.role)
    # Forge an already-expired variant of a legitimately signed token shape.
    payload_b64, _ = expired_token.split(".", 1)
    padding = "=" * (-len(payload_b64) % 4)
    import base64
    import json

    data = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
    data["exp"] = int(time.time()) - 1
    new_payload = json.dumps(data, separators=(",", ":"))
    new_payload_b64 = base64.urlsafe_b64encode(new_payload.encode()).decode().rstrip("=")
    forged_signature = security._sign(new_payload_b64)
    forged_token = f"{new_payload_b64}.{forged_signature}"

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert response.status_code == 401


def test_regular_user_cannot_escalate_role_via_self_login(client, user_headers):
    # There is no self-service profile-update endpoint; a regular user has
    # no path to elevate their own role. Confirm the admin-only routes stay
    # closed even with a perfectly valid, non-expired token.
    response = client.get("/admin/users", headers=user_headers)
    assert response.status_code == 403


def test_password_hash_never_leaks_in_api_responses(client, admin_headers, regular_user, admin_user):
    response = client.get("/admin/users", headers=admin_headers)
    body_text = response.text
    assert "password_hash" not in body_text
    assert "pbkdf2_sha256" not in body_text
