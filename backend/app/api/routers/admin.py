from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
import httpx
from urllib.parse import quote
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.config import settings
from app.db.session import get_db
from app.models import ApiKey, Document, GeoLayer, Translation, User
from app.schemas import ApiKeyCreateOut, ApiKeyOut, DocumentOut, GeoLayerOut, TranslationOut, TranslationUpsert, UserAdminCreate, UserAdminOut, UserAdminUpdate
from app.services.admin_user_service import AdminUserService
from app.services.admin_console_service import (
    create_api_key as issue_api_key, delete_record, get_api_key, list_api_keys as fetch_api_keys,
    list_translations as fetch_translations,
    serialize_api_key, serialize_translation, upsert_translation as save_translation,
)
from app.services.document_service import DocumentService
from app.services.geo_layer_service import GeoLayerService

router = APIRouter(prefix="/admin", tags=["admin"])
public_router = APIRouter(prefix="/layers", tags=["layers"])


def _to_document_out(document: Document) -> DocumentOut:
    return DocumentOut(
        id=document.id, title=document.title, summary=document.summary,
        original_filename=document.original_filename, content_type=document.content_type,
        size_bytes=document.size_bytes, created_at=document.created_at.isoformat(),
    )


@router.get("/ping")
def admin_ping(user: User = Depends(require_admin)) -> dict[str, str]:
    return {"message": f"Welcome admin {user.full_name}"}


def _to_user_out(user: User) -> UserAdminOut:
    return UserAdminOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
    )


@router.get("/users", response_model=list[UserAdminOut])
def list_admin_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserAdminOut]:
    users = AdminUserService(db).list_users()
    return [_to_user_out(user) for user in users]


@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: UserAdminCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserAdminOut:
    user = AdminUserService(db).create_user(payload)
    return _to_user_out(user)


@router.put("/users/{user_id}", response_model=UserAdminOut)
def update_admin_user(
    user_id: str,
    payload: UserAdminUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserAdminOut:
    user = AdminUserService(db).update_user(user_id=user_id, payload=payload)
    return _to_user_out(user)


@router.delete("/users/{user_id}")
def delete_admin_user(
    user_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    AdminUserService(db).delete_user(user_id=user_id)
    return {"message": "User deleted"}


@router.get("/api-keys", response_model=list[ApiKeyOut])
def list_api_keys(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [serialize_api_key(item) for item in fetch_api_keys(db)]


@router.post("/api-keys", response_model=ApiKeyCreateOut, status_code=status.HTTP_201_CREATED)
def create_api_key(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    item, secret = issue_api_key(db)
    return serialize_api_key(item, secret)


@router.patch("/api-keys/{key_id}", response_model=ApiKeyOut)
def toggle_api_key(key_id: str, is_active: bool, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    item = get_api_key(db, key_id)
    item.is_active = is_active
    db.commit()
    db.refresh(item)
    return serialize_api_key(item)


@router.delete("/api-keys/{key_id}")
def delete_api_key(key_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    delete_record(db, ApiKey, key_id, "API key")
    return {"message": "API key deleted"}


@router.get("/translations", response_model=list[TranslationOut])
def list_translations(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [serialize_translation(item) for item in fetch_translations(db)]


@router.put("/translations", response_model=TranslationOut)
def upsert_translation(payload: TranslationUpsert, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    return serialize_translation(save_translation(db, payload))


@router.delete("/translations/{translation_id}")
def delete_translation(translation_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail="Fixed translations cannot be deleted")


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [_to_document_out(item) for item in DocumentService(db).list_documents()]


@router.post("/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    title: str = Form(...),
    summary: str | None = Form(default=None),
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    document = await DocumentService(db).create(title=title, summary=summary, file=file)
    return _to_document_out(document)


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    DocumentService(db).delete(document_id)
    return {"message": "Document deleted"}


def _to_layer_out(layer: GeoLayer, request_base: str) -> GeoLayerOut:
    from app.services.geo_layer_service import serialize_layer
    return serialize_layer(layer, request_base)


@router.get("/geo-layers", response_model=list[GeoLayerOut])
def list_geo_layers(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [_to_layer_out(item, "") for item in GeoLayerService(db).list_layers()]


@router.post("/geo-layers/raster", response_model=GeoLayerOut, status_code=status.HTTP_201_CREATED)
async def upload_raster_layer(
    title: str = Form(...), summary: str | None = Form(default=None), location_tag: str = Form(default="chiang-rai"), palette: str | None = Form(default=None),
    file: UploadFile = File(...), _: User = Depends(require_admin), db: Session = Depends(get_db),
):
    layer = await GeoLayerService(db).upload_raster(title=title, summary=summary, location_tag=location_tag, palette=palette, file=file)
    return _to_layer_out(layer, "")


@router.post("/geo-layers/vector", response_model=GeoLayerOut, status_code=status.HTTP_201_CREATED)
async def upload_vector_layer(
    title: str = Form(...), summary: str | None = Form(default=None), location_tag: str = Form(default="chiang-rai"), file: UploadFile = File(...),
    _: User = Depends(require_admin), db: Session = Depends(get_db),
):
    layer = await GeoLayerService(db).upload_vector(title=title, summary=summary, location_tag=location_tag, file=file)
    return _to_layer_out(layer, "")


@router.delete("/geo-layers/{layer_id}")
def delete_geo_layer(layer_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    GeoLayerService(db).delete(layer_id)
    return {"message": "Layer deleted"}


async def _raster_tile_response(layer_id: str, z: int, x: int, y: int, db: Session):
    layer = GeoLayerService(db).get(layer_id)
    if layer.data_kind != "raster":
        return Response(status_code=404)
    titiler_file_path = Path(settings.titiler_upload_dir).resolve() / Path(layer.source_path).name
    titiler_file_url = titiler_file_path.as_uri()
    query = f"url={quote(titiler_file_url, safe='')}&rescale=0,1"
    if layer.palette:
        query += f"&colormap_name={quote(layer.palette)}"
    tile_url = f"{settings.titiler_url.rstrip('/')}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?{query}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            tile = await client.get(tile_url)
        return Response(content=tile.content, status_code=tile.status_code, media_type=tile.headers.get("content-type", "image/png"))
    except httpx.HTTPError:
        return Response(content=b"TiTiler unavailable", status_code=502, media_type="text/plain")


@router.get("/geo-layers/{layer_id}/tiles/{z}/{x}/{y}.png")
async def raster_tile(layer_id: str, z: int, x: int, y: int, db: Session = Depends(get_db)):
    return await _raster_tile_response(layer_id, z, x, y, db)


@router.get("/geo-layers/{layer_id}/tiles/{z}/{x}/{y}.pbf")
def vector_tile(layer_id: str, z: int, x: int, y: int, db: Session = Depends(get_db)):
    layer = GeoLayerService(db).get(layer_id)
    if layer.data_kind != "vector" or layer.layer_type != "mvt":
        return Response(status_code=404)
    table = layer.vector_table
    from app.services.geo_layer_service import _safe_identifier
    sql = text(f'''WITH tile AS (SELECT ST_AsMVTGeom(geom, ST_TileEnvelope(:z, :x, :y), 4096, 64, true) AS geom, id, properties FROM "{_safe_identifier(table)}" WHERE geom && ST_TileEnvelope(:z, :x, :y)) SELECT ST_AsMVT(tile, 'layer', 4096, 'geom') FROM tile''')
    tile = db.execute(sql, {"z": z, "x": x, "y": y}).scalar() or b""
    return Response(content=bytes(tile), media_type="application/vnd.mapbox-vector-tile")


@router.get("/geo-layers/{layer_id}/data")
def vector_geojson(layer_id: str, db: Session = Depends(get_db)):
    layer = GeoLayerService(db).get(layer_id)
    if layer.data_kind != "vector":
        return Response(status_code=404)
    from app.services.geo_layer_service import _safe_identifier
    rows = db.execute(text(f'''SELECT id, properties, ST_AsGeoJSON(geom) AS geometry FROM "{_safe_identifier(layer.vector_table)}" ORDER BY id LIMIT 10000''')).mappings()
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "id": row["id"], "properties": row["properties"], "geometry": json.loads(row["geometry"])} for row in rows]}


@public_router.get("", response_model=list[GeoLayerOut])
def public_layers(db: Session = Depends(get_db)):
    return [_to_layer_out(item, "") for item in GeoLayerService(db).list_layers()]


@public_router.get("/translations")
def public_translations(language: str = Query(default="en", pattern="^(en|th)$"), db: Session = Depends(get_db)):
    return [serialize_translation(item) for item in fetch_translations(db, language)]


@public_router.get("/{layer_id}/tiles/{z}/{x}/{y}.png")
async def public_raster_tile(layer_id: str, z: int, x: int, y: int, db: Session = Depends(get_db)):
    return await _raster_tile_response(layer_id, z, x, y, db)


@public_router.get("/{layer_id}/tiles/{z}/{x}/{y}.pbf")
def public_vector_tile(layer_id: str, z: int, x: int, y: int, db: Session = Depends(get_db)):
    return vector_tile(layer_id, z, x, y, db)


@public_router.get("/{layer_id}/data")
def public_vector_geojson(layer_id: str, db: Session = Depends(get_db)):
    return vector_geojson(layer_id, db)
