from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


def test_upsert_translation_requires_admin(client, user_headers):
    payload = {"namespace": "header", "key": "brand", "language": "en", "value": "CRVA"}
    assert client.put("/admin/translations", json=payload, headers=user_headers).status_code == 403


def test_upsert_and_list_translation(client, admin_headers):
    payload = {"namespace": "header", "key": "brand", "language": "en", "value": "CRVA"}
    response = client.put("/admin/translations", json=payload, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["value"] == "CRVA"

    listing = client.get("/admin/translations", headers=admin_headers)
    values = [t for t in listing.json() if t["namespace"] == "header" and t["key"] == "brand"]
    assert len(values) == 2  # english + auto-seeded thai placeholder


def test_upsert_rejects_key_outside_fixed_set(client, admin_headers):
    payload = {"namespace": "made-up", "key": "made-up", "language": "en", "value": "x"}
    response = client.put("/admin/translations", json=payload, headers=admin_headers)
    assert response.status_code == 422


def test_delete_translation_is_not_allowed(client, admin_headers):
    response = client.delete("/admin/translations/any-id", headers=admin_headers)
    assert response.status_code == 405


def test_public_translations_endpoint_requires_no_auth(client):
    response = client.get("/layers/translations", params={"language": "en"})
    assert response.status_code == 200


def test_public_translations_endpoint_rejects_bad_language(client):
    response = client.get("/layers/translations", params={"language": "fr"})
    assert response.status_code == 422
