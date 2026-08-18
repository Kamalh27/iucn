from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


def test_create_api_key_requires_admin(client, user_headers):
    assert client.post("/admin/api-keys", headers=user_headers).status_code == 403


def test_create_and_list_api_key(client, admin_headers):
    create = client.post("/admin/api-keys", headers=admin_headers)
    assert create.status_code == 201
    created = create.json()
    assert created["api_key"].startswith("nbs_")

    listing = client.get("/admin/api-keys", headers=admin_headers)
    assert listing.status_code == 200
    ids = [item["id"] for item in listing.json()]
    assert created["id"] in ids
    # The raw secret is never returned again once issued.
    assert all("api_key" not in item for item in listing.json())


def test_toggle_api_key(client, admin_headers):
    created = client.post("/admin/api-keys", headers=admin_headers).json()
    response = client.patch(f"/admin/api-keys/{created['id']}", params={"is_active": False}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_toggle_missing_api_key_returns_404(client, admin_headers):
    response = client.patch("/admin/api-keys/does-not-exist", params={"is_active": False}, headers=admin_headers)
    assert response.status_code == 404


def test_delete_api_key(client, admin_headers):
    created = client.post("/admin/api-keys", headers=admin_headers).json()
    response = client.delete(f"/admin/api-keys/{created['id']}", headers=admin_headers)
    assert response.status_code == 200

    listing = client.get("/admin/api-keys", headers=admin_headers).json()
    assert created["id"] not in [item["id"] for item in listing]
