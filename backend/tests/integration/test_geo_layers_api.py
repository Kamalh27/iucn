from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


def test_list_geo_layers_requires_admin(client, user_headers):
    assert client.get("/admin/geo-layers", headers=user_headers).status_code == 403


def test_list_geo_layers_empty_by_default(client, admin_headers):
    response = client.get("/admin/geo-layers", headers=admin_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_delete_missing_geo_layer_returns_404(client, admin_headers):
    response = client.delete("/admin/geo-layers/does-not-exist", headers=admin_headers)
    assert response.status_code == 404


def test_public_layers_endpoint_needs_no_auth(client):
    response = client.get("/layers")
    assert response.status_code == 200
    assert response.json() == []


def test_raster_tile_for_missing_layer_returns_404(client):
    response = client.get("/layers/does-not-exist/tiles/1/2/3.png")
    assert response.status_code == 404
