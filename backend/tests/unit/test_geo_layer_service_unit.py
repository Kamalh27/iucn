from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.models import GeoLayer
from app.services.geo_layer_service import GeoLayerService, _safe_identifier, serialize_layer

pytestmark = pytest.mark.unit


class TestSafeIdentifier:
    @pytest.mark.parametrize("value", ["layer_abc123", "a", "_private", "layer_1"])
    def test_accepts_well_formed_identifiers(self, value):
        assert _safe_identifier(value) == value

    @pytest.mark.parametrize(
        "value",
        [
            "layer\"; DROP TABLE users; --",
            "layer name with spaces",
            "1_starts_with_digit",
            "UPPERCASE",
            "layer-with-dash",
            "",
            "layer;drop",
        ],
    )
    def test_rejects_sql_injection_and_invalid_identifiers(self, value):
        with pytest.raises(ValueError):
            _safe_identifier(value)


class TestValidateTitle:
    def test_rejects_blank_title(self):
        with pytest.raises(HTTPException) as exc:
            GeoLayerService._validate_title("   ")
        assert exc.value.status_code == 422

    def test_accepts_non_blank_title(self):
        GeoLayerService._validate_title("Flood risk map")  # should not raise


class TestValidateLocationTag:
    def test_normalizes_known_tag(self):
        assert GeoLayerService._validate_location_tag("Chiang-Rai") == "chiang-rai"

    def test_rejects_unknown_tag(self):
        with pytest.raises(HTTPException) as exc:
            GeoLayerService._validate_location_tag("unknown-place")
        assert exc.value.status_code == 422


class TestSerializeLayer:
    def _layer(self, **overrides) -> GeoLayer:
        defaults = dict(
            id="layer-1",
            title="Flood risk",
            summary="Summary",
            location_tag="chiang-rai",
            data_kind="raster",
            layer_type="cog",
            palette="viridis",
            bbox=json.dumps([0, 0, 1, 1]),
            source_path="/tmp/x.tif",
            source_filename="x.tif",
            size_bytes=123,
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        defaults.update(overrides)
        return GeoLayer(**defaults)

    def test_raster_layer_gets_png_tile_url(self):
        result = serialize_layer(self._layer(), "https://api.example.com")
        assert result["tile_url"] == "https://api.example.com/layers/layer-1/tiles/{z}/{x}/{y}.png"
        assert result["data_url"] == "https://api.example.com/layers/layer-1/data"
        assert result["bbox"] == [0, 0, 1, 1]

    def test_vector_mvt_layer_gets_pbf_tile_url(self):
        layer = self._layer(data_kind="vector", layer_type="mvt")
        result = serialize_layer(layer, "https://api.example.com")
        assert result["tile_url"] == "https://api.example.com/layers/layer-1/tiles/{z}/{x}/{y}.pbf"

    def test_vector_geojson_layer_has_no_tile_url(self):
        layer = self._layer(data_kind="vector", layer_type="geojson")
        result = serialize_layer(layer, "https://api.example.com")
        assert "tile_url" not in result

    def test_trailing_slash_on_base_url_is_stripped(self):
        result = serialize_layer(self._layer(), "https://api.example.com/")
        assert result["data_url"] == "https://api.example.com/layers/layer-1/data"
