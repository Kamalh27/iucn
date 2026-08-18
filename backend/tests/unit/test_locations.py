from __future__ import annotations

import pytest

from app.core.locations import validate_location_tag

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("chiang-rai", "chiang-rai"),
        ("CHIANG-RAI", "chiang-rai"),
        ("  surat-thani  ", "surat-thani"),
        ("Surat-Thani", "surat-thani"),
    ],
)
def test_validate_location_tag_normalizes_known_values(raw, expected):
    assert validate_location_tag(raw) == expected


@pytest.mark.parametrize("raw", ["bangkok", "", "chiang rai", "chiang-rai; drop table users"])
def test_validate_location_tag_rejects_unknown_values(raw):
    with pytest.raises(ValueError):
        validate_location_tag(raw)
