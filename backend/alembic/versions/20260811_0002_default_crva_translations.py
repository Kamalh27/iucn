"""Seed English and Thai portal translations."""
from alembic import op
import sqlalchemy as sa

revision = "20260811_0002"
down_revision = "20260811_0001"
branch_labels = None
depends_on = None

_keys = {
    "nav.userManagement": ("User management", "จัดการผู้ใช้"),
    "nav.apiKeys": ("API keys", "คีย์ API"),
    "nav.languageEditor": ("Language editor", "แก้ไขภาษา"),
    "nav.documents": ("Documents", "เอกสาร"),
    "nav.geoData": ("Geo data", "ข้อมูลภูมิสารสนเทศ"),
    "admin.console": ("CRVA Admin Console", "ศูนย์ผู้ดูแล CRVA"),
    "admin.workspace": ("CRVA Admin workspace", "พื้นที่ทำงานผู้ดูแล CRVA"),
    "admin.manage": ("Manage access, integrations, documents, language, and map data.", "จัดการสิทธิ์ การเชื่อมต่อ เอกสาร ภาษา และข้อมูลแผนที่"),
}


def upgrade() -> None:
    for index, (compound_key, values) in enumerate(_keys.items(), start=1):
        namespace, key = compound_key.split(".", 1)
        for language, value in zip(("en", "th"), values):
            op.execute(sa.text("""
                INSERT INTO translations (id, namespace, key, language, value, updated_at)
                VALUES (:id, :namespace, :key, :language, :value, CURRENT_TIMESTAMP)
                ON CONFLICT (namespace, key, language) DO NOTHING
            """).bindparams(id=f"default-{index}-{language}", namespace=namespace, key=key, language=language, value=value))


def downgrade() -> None:
    for namespace, key in (item.split(".", 1) for item in _keys):
        op.execute(sa.text("DELETE FROM translations WHERE namespace = :namespace AND key = :key").bindparams(namespace=namespace, key=key))
