from __future__ import annotations

import json
import re
import tempfile
import zipfile
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
import geopandas as gpd
from rasterio import open as raster_open
from rasterio.enums import Resampling
from rasterio.transform import array_bounds
from rasterio.warp import calculate_default_transform, reproject
from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles
from shapely.geometry import shape
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.locations import validate_location_tag
from app.models import GeoLayer

WEB_MERCATOR = "EPSG:3857"
_SAFE_IDENTIFIER = re.compile(r"^[a-z_][a-z0-9_]*$")


def _safe_identifier(value: str) -> str:
    if not _SAFE_IDENTIFIER.fullmatch(value):
        raise ValueError("Invalid database identifier")
    return value


def serialize_layer(layer: GeoLayer, public_base_url: str = "") -> dict:
    result = {
        "id": layer.id, "title": layer.title, "summary": layer.summary,
        "location_tag": layer.location_tag,
        "data_kind": layer.data_kind, "layer_type": layer.layer_type,
        "palette": layer.palette, "bbox": json.loads(layer.bbox),
        "source_filename": layer.source_filename, "size_bytes": layer.size_bytes,
        "created_at": layer.created_at.isoformat(),
    }
    base = public_base_url.rstrip('/')
    result["data_url"] = f"{base}/layers/{layer.id}/data"
    if layer.data_kind == "raster":
        result["tile_url"] = f"{base}/layers/{layer.id}/tiles/{{z}}/{{x}}/{{y}}.png"
    elif layer.layer_type == "mvt":
        result["tile_url"] = f"{base}/layers/{layer.id}/tiles/{{z}}/{{x}}/{{y}}.pbf"
    return result


class GeoLayerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def list_layers(self) -> list[GeoLayer]:
        return list(self.db.query(GeoLayer).order_by(GeoLayer.created_at.desc()).all())

    async def upload_raster(self, *, title: str, summary: str | None, location_tag: str, palette: str | None, file: UploadFile) -> GeoLayer:
        self._validate_title(title)
        location_tag = self._validate_location_tag(location_tag)
        if not file.filename or Path(file.filename).suffix.lower() not in {".tif", ".tiff", ".geotiff"}:
            raise HTTPException(status_code=400, detail="Raster upload must be a GeoTIFF or COG (.tif, .tiff, or .geotiff)")
        original = Path(file.filename).name
        raw_path = self.upload_dir / f"{uuid4().hex}_{original}"
        cog_path = self.upload_dir / f"{uuid4().hex}.cog.tif"
        try:
            raw_path.write_bytes(await file.read())
            with raster_open(raw_path) as source:
                if not source.crs:
                    raise HTTPException(status_code=422, detail="Raster must have a CRS")
                transform, width, height = calculate_default_transform(source.crs, WEB_MERCATOR, source.width, source.height, *source.bounds)
                profile = source.profile.copy()
                profile.update(driver="GTiff", crs=WEB_MERCATOR, transform=transform, width=width, height=height, tiled=True, compress="deflate")
                projected_path = self.upload_dir / f"{uuid4().hex}.projected.tif"
                with raster_open(projected_path, "w", **profile) as destination:
                    for index in range(1, source.count + 1):
                        band = source.read(index)
                        projected_band = __import__("numpy").empty((height, width), dtype=band.dtype)
                        reproject(band, projected_band, src_transform=source.transform, src_crs=source.crs, dst_transform=transform, dst_crs=WEB_MERCATOR, resampling=Resampling.nearest)
                        destination.write(projected_band, index)
                cog_translate(projected_path, cog_path, cog_profiles.get("deflate"), in_memory=False, quiet=True)
                projected_path.unlink(missing_ok=True)
                bounds = array_bounds(height, width, transform)
                size_bytes = cog_path.stat().st_size
            raw_path.unlink(missing_ok=True)
            layer = GeoLayer(title=title.strip(), summary=summary.strip() if summary else None, location_tag=location_tag, data_kind="raster", layer_type="cog", palette=palette, bbox=json.dumps(list(bounds)), source_path=str(cog_path), source_filename=original, size_bytes=size_bytes)
            self.db.add(layer); self.db.commit(); self.db.refresh(layer)
            return layer
        except HTTPException:
            raw_path.unlink(missing_ok=True); cog_path.unlink(missing_ok=True); raise
        except Exception as exc:
            raw_path.unlink(missing_ok=True); cog_path.unlink(missing_ok=True)
            raise HTTPException(status_code=422, detail=f"Unable to convert raster to COG: {exc}") from exc
        finally:
            await file.close()

    async def upload_vector(self, *, title: str, summary: str | None, location_tag: str, file: UploadFile) -> GeoLayer:
        self._validate_title(title)
        location_tag = self._validate_location_tag(location_tag)
        suffix = Path(file.filename).suffix.lower() if file.filename else ""
        if not file.filename or suffix not in {".zip", ".geojson", ".json", ".gpkg", ".parquet", ".geoparquet"}:
            raise HTTPException(status_code=400, detail="Vector upload supports ZIP Shapefiles, GeoJSON, GeoPackage, or GeoParquet")
        if not settings.database_url.startswith(("postgresql", "postgres")):
            raise HTTPException(status_code=503, detail="Vector ingestion requires a PostgreSQL/PostGIS database")
        original = Path(file.filename).name
        source_path = self.upload_dir / f"{uuid4().hex}_{original}"
        try:
            source_path.write_bytes(await file.read())
            vector_path = source_path
            extracted: tempfile.TemporaryDirectory | None = None
            if suffix == ".zip":
                extracted = tempfile.TemporaryDirectory(prefix="nbs-shapefile-")
                with zipfile.ZipFile(source_path) as archive:
                    safe_members = [member for member in archive.infolist() if not Path(member.filename).is_absolute() and ".." not in Path(member.filename).parts]
                    if not any(Path(member.filename).suffix.lower() == ".shp" for member in safe_members):
                        raise ValueError("ZIP archive must contain a Shapefile (.shp) and its supporting files")
                    archive.extractall(extracted.name, members=safe_members)
                vector_path = next(Path(extracted.name).rglob("*.shp"), None)
                if vector_path is None:
                    raise ValueError("Shapefile was not found in ZIP archive")
            frame = gpd.read_parquet(vector_path) if suffix in {".parquet", ".geoparquet"} else gpd.read_file(vector_path)
            if frame.empty:
                raise ValueError("Vector file contains no features")
            frame = frame.set_crs("EPSG:4326") if frame.crs is None else frame
            frame = frame.to_crs(WEB_MERCATOR)
            table_name = _safe_identifier(f"layer_{uuid4().hex}")
            connection = self.db.connection()
            connection.execute(text(f'CREATE TABLE "{table_name}" (id bigserial PRIMARY KEY, properties jsonb NOT NULL, geom geometry(Geometry, 3857) NOT NULL)'))
            bounds = None
            for feature in frame.iterfeatures():
                if feature["geometry"] is None:
                    continue
                geometry = shape(feature["geometry"])
                bounds = geometry.bounds if bounds is None else (min(bounds[0], geometry.bounds[0]), min(bounds[1], geometry.bounds[1]), max(bounds[2], geometry.bounds[2]), max(bounds[3], geometry.bounds[3]))
                connection.execute(text(f'INSERT INTO "{table_name}" (properties, geom) VALUES (:properties, ST_GeomFromText(:wkt, 3857))'), {"properties": json.dumps(feature.get("properties") or {}), "wkt": geometry.wkt})
            if bounds is None:
                raise ValueError("Vector file contains no valid geometries")
            size_bytes = source_path.stat().st_size
            layer_type = "mvt" if size_bytes >= settings.vector_mvt_threshold_bytes else "geojson"
            layer = GeoLayer(title=title.strip(), summary=summary.strip() if summary else None, location_tag=location_tag, data_kind="vector", layer_type=layer_type, bbox=json.dumps(list(bounds)), source_path=str(source_path), source_filename=original, vector_table=table_name, size_bytes=size_bytes)
            self.db.add(layer); self.db.commit(); self.db.refresh(layer)
            if extracted is not None:
                extracted.cleanup()
            return layer
        except HTTPException:
            source_path.unlink(missing_ok=True); raise
        except Exception as exc:
            self.db.rollback(); source_path.unlink(missing_ok=True)
            raise HTTPException(status_code=422, detail=f"Unable to ingest vector data: {exc}") from exc
        finally:
            await file.close()

    def delete(self, layer_id: str) -> None:
        layer = self.db.get(GeoLayer, layer_id)
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        if layer.vector_table:
            self.db.execute(text(f'DROP TABLE IF EXISTS "{_safe_identifier(layer.vector_table)}"'))
        Path(layer.source_path).unlink(missing_ok=True)
        self.db.delete(layer); self.db.commit()

    def get(self, layer_id: str) -> GeoLayer:
        layer = self.db.get(GeoLayer, layer_id)
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        return layer

    @staticmethod
    def _validate_title(title: str) -> None:
        if not title.strip():
            raise HTTPException(status_code=422, detail="Title is required")

    @staticmethod
    def _validate_location_tag(location_tag: str) -> str:
        try:
            return validate_location_tag(location_tag)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
