from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db.base import Base


class GeoLayer(Base):
    __tablename__ = "geo_layers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    location_tag = Column(String, nullable=False, default="chiang-rai")
    data_kind = Column(String, nullable=False)  # raster | vector
    layer_type = Column(String, nullable=False)  # cog | mvt | geojson
    palette = Column(String, nullable=True)
    bbox = Column(Text, nullable=False)  # JSON array [west, south, east, north] in EPSG:3857
    source_path = Column(String, nullable=False)
    source_filename = Column(String, nullable=False)
    vector_table = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
