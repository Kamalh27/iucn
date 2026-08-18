from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


def test_login_with_valid_credentials_returns_token(client, regular_user):
    response = client.post("/auth/login", json={"email": "user@example.com", "password": "user-pass-123"})
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["user"]["email"] == "user@example.com"
    assert body["user"]["role"] == "user"


def test_login_with_wrong_password_is_rejected(client, regular_user):
    response = client.post("/auth/login", json={"email": "user@example.com", "password": "wrong"})
    assert response.status_code == 401


def test_login_with_unknown_email_is_rejected(client):
    response = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever"})
    assert response.status_code == 401


def test_login_for_inactive_user_is_rejected(client, user_factory):
    user_factory(email="inactive@example.com", password="pass1234", is_active=False)
    response = client.post("/auth/login", json={"email": "inactive@example.com", "password": "pass1234"})
    assert response.status_code == 401


def test_admin_login_succeeds_for_admin_role(client, admin_user):
    response = client.post("/auth/admin/login", json={"email": "admin@example.com", "password": "admin-pass-123"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_admin_login_rejects_non_admin_role(client, regular_user):
    response = client.post("/auth/admin/login", json={"email": "user@example.com", "password": "user-pass-123"})
    assert response.status_code == 403


def test_me_requires_bearer_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user(client, user_headers, regular_user):
    response = client.get("/auth/me", headers=user_headers)
    assert response.status_code == 200
    assert response.json()["id"] == regular_user.id


def test_logout_revokes_token(client, user_headers):
    logout_response = client.post("/auth/logout", headers=user_headers)
    assert logout_response.status_code == 200

    reuse_response = client.get("/auth/me", headers=user_headers)
    assert reuse_response.status_code == 401


def test_login_payload_requires_valid_email_format(client):
    response = client.post("/auth/login", json={"email": "not-an-email", "password": "whatever"})
    assert response.status_code == 422
