from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


def test_list_users_requires_admin_role(client, user_headers):
    response = client.get("/admin/users", headers=user_headers)
    assert response.status_code == 403


def test_list_users_requires_authentication(client):
    response = client.get("/admin/users")
    assert response.status_code == 401


def test_list_users_as_admin(client, admin_headers, admin_user, regular_user):
    response = client.get("/admin/users", headers=admin_headers)
    assert response.status_code == 200
    emails = {u["email"] for u in response.json()}
    assert {admin_user.email, regular_user.email}.issubset(emails)


def test_create_user_as_admin(client, admin_headers):
    payload = {"full_name": "New Person", "email": "new@example.com", "password": "supersecret1", "role": "user"}
    response = client.post("/admin/users", json=payload, headers=admin_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert "password" not in body
    assert "password_hash" not in body


def test_create_user_rejects_duplicate_email(client, admin_headers, regular_user):
    payload = {"full_name": "Dup", "email": regular_user.email, "password": "supersecret1", "role": "user"}
    response = client.post("/admin/users", json=payload, headers=admin_headers)
    assert response.status_code == 409


def test_create_user_rejects_short_password(client, admin_headers):
    payload = {"full_name": "Short", "email": "short@example.com", "password": "short", "role": "user"}
    response = client.post("/admin/users", json=payload, headers=admin_headers)
    assert response.status_code == 422


def test_update_user_changes_fields(client, admin_headers, regular_user):
    response = client.put(
        f"/admin/users/{regular_user.id}",
        json={"full_name": "Renamed"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Renamed"


def test_update_missing_user_returns_404(client, admin_headers):
    response = client.put("/admin/users/does-not-exist", json={"full_name": "No Such User"}, headers=admin_headers)
    assert response.status_code == 404


def test_cannot_demote_last_active_admin(client, admin_headers, admin_user):
    response = client.put(
        f"/admin/users/{admin_user.id}",
        json={"role": "user"},
        headers=admin_headers,
    )
    assert response.status_code == 403


def test_cannot_deactivate_last_active_admin(client, admin_headers, admin_user):
    response = client.put(
        f"/admin/users/{admin_user.id}",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert response.status_code == 403


def test_can_demote_admin_when_another_admin_remains(client, admin_headers, admin_user, user_factory):
    from app.core import security

    second_admin = user_factory(email="second-admin@example.com", password="pass12345", role="admin")
    second_headers = {"Authorization": f"Bearer {security.create_access_token(user_id=second_admin.id, email=second_admin.email, role=second_admin.role)}"}

    response = client.put(f"/admin/users/{admin_user.id}", json={"role": "user"}, headers=second_headers)
    assert response.status_code == 200


def test_delete_user_as_admin(client, admin_headers, regular_user):
    response = client.delete(f"/admin/users/{regular_user.id}", headers=admin_headers)
    assert response.status_code == 200

    listing = client.get("/admin/users", headers=admin_headers)
    assert regular_user.email not in {u["email"] for u in listing.json()}


def test_delete_last_active_admin_is_forbidden(client, admin_headers, admin_user):
    response = client.delete(f"/admin/users/{admin_user.id}", headers=admin_headers)
    assert response.status_code == 403


def test_admin_ping_requires_admin(client, admin_headers, user_headers):
    assert client.get("/admin/ping", headers=admin_headers).status_code == 200
    assert client.get("/admin/ping", headers=user_headers).status_code == 403
    assert client.get("/admin/ping").status_code == 401
