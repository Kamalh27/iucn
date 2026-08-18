"""Seed fixed portal translation keys for the language editor."""
from alembic import op
import sqlalchemy as sa

revision = "20260811_0004"
down_revision = "20260811_0003"
branch_labels = None
depends_on = None

_keys = {
    "header.brand": ("CRVA", "CRVA"),
    "header.subtitle": ("Climate Risk and Vulnerability Assessment", "การประเมินความเสี่ยงและความเปราะบางต่อสภาพภูมิอากาศ"),
    "header.mapViewer": ("Map Viewer", "แผนที่"),
    "header.language": ("Language", "ภาษา"),
    "dashboard.title": ("Climate Risk and Vulnerability Assessment", "การประเมินความเสี่ยงและความเปราะบางต่อสภาพภูมิอากาศ"),
    "dashboard.description": ("CRVA provides a public map viewer with an admin workspace for operational tools.", "CRVA ให้บริการแผนที่สาธารณะและพื้นที่ผู้ดูแลระบบสำหรับเครื่องมือปฏิบัติงาน"),
    "dashboard.openMap": ("Open Map Viewer", "เปิดแผนที่"),
    "dashboard.adminLogin": ("Admin Login", "เข้าสู่ระบบผู้ดูแล"),
    "map.location": ("Map location", "ตำแหน่งแผนที่"),
    "map.chiangRai": ("Chiang Rai", "เชียงราย"),
    "map.suratThani": ("Surat Thani", "สุราษฎร์ธานี"),
    "map.layers": ("Layers", "ชั้นข้อมูล"),
    "map.cartoLight": ("CARTO Light", "CARTO สว่าง"),
    "map.cartoDark": ("CARTO Dark", "CARTO มืด"),
    "map.imagery": ("Imagery", "ภาพถ่ายดาวเทียม"),
    "map.myLocation": ("My location", "ตำแหน่งของฉัน"),
    "map.zoomIn": ("Zoom in", "ขยายแผนที่"),
    "map.zoomOut": ("Zoom out", "ย่อแผนที่"),
    "map.fullscreen": ("Fullscreen", "เต็มหน้าจอ"),
}


def upgrade() -> None:
    for index, (compound_key, values) in enumerate(_keys.items(), start=1):
        namespace, key = compound_key.split(".", 1)
        for language, value in zip(("en", "th"), values):
            op.execute(sa.text("""
                INSERT INTO translations (id, namespace, key, language, value, updated_at)
                VALUES (:id, :namespace, :key, :language, :value, CURRENT_TIMESTAMP)
                ON CONFLICT (namespace, key, language) DO NOTHING
            """).bindparams(id=f"fixed-{index}-{language}", namespace=namespace, key=key, language=language, value=value))


def downgrade() -> None:
    for compound_key in _keys:
        namespace, key = compound_key.split(".", 1)
        op.execute(sa.text("DELETE FROM translations WHERE namespace = :namespace AND key = :key").bindparams(namespace=namespace, key=key))
