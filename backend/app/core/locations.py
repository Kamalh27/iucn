from __future__ import annotations

LOCATION_TAGS = {
    "chiang-rai": "Chiang Rai",
    "surat-thani": "Surat Thani",
}


def validate_location_tag(location_tag: str) -> str:
    normalized = location_tag.strip().lower()
    if normalized not in LOCATION_TAGS:
        raise ValueError("Location must be Chiang Rai or Surat Thani")
    return normalized
