from pydantic import BaseModel


class GeoLayerOut(BaseModel):
    id: str
    title: str
    summary: str | None = None
    location_tag: str
    data_kind: str
    layer_type: str
    palette: str | None = None
    bbox: list[float]
    source_filename: str
    size_bytes: int
    created_at: str
    tile_url: str | None = None
    data_url: str | None = None
