"""Initial CRVA schema."""
from alembic import op
import sqlalchemy as sa

revision = "20260811_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    # This project previously used SQLAlchemy create_all(). If that schema is
    # already present, adopt it as the Alembic baseline instead of recreating it.
    if sa.inspect(op.get_bind()).has_table("users"):
        return
    op.create_table("users", sa.Column("id", sa.String(), nullable=False), sa.Column("email", sa.String(), nullable=False), sa.Column("full_name", sa.String(), nullable=False), sa.Column("role", sa.String(), nullable=False), sa.Column("password_hash", sa.String(), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("email"))
    op.create_table("api_keys", sa.Column("id", sa.String(), nullable=False), sa.Column("key_prefix", sa.String(), nullable=False), sa.Column("key_hash", sa.String(), nullable=False), sa.Column("scope", sa.String(), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("last_used_at", sa.DateTime(), nullable=True), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("key_hash"))
    op.create_table("translations", sa.Column("id", sa.String(), nullable=False), sa.Column("namespace", sa.String(), nullable=False), sa.Column("key", sa.String(), nullable=False), sa.Column("language", sa.String(), nullable=False), sa.Column("value", sa.Text(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("namespace", "key", "language", name="uq_translation_key_language"))
    op.create_table("documents", sa.Column("id", sa.String(), nullable=False), sa.Column("title", sa.String(), nullable=False), sa.Column("summary", sa.Text(), nullable=True), sa.Column("original_filename", sa.String(), nullable=False), sa.Column("stored_filename", sa.String(), nullable=False), sa.Column("content_type", sa.String(), nullable=True), sa.Column("size_bytes", sa.Integer(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("stored_filename"))
    op.create_table("geo_layers", sa.Column("id", sa.String(), nullable=False), sa.Column("title", sa.String(), nullable=False), sa.Column("summary", sa.Text(), nullable=True), sa.Column("data_kind", sa.String(), nullable=False), sa.Column("layer_type", sa.String(), nullable=False), sa.Column("palette", sa.String(), nullable=True), sa.Column("bbox", sa.Text(), nullable=False), sa.Column("source_path", sa.String(), nullable=False), sa.Column("source_filename", sa.String(), nullable=False), sa.Column("vector_table", sa.String(), nullable=True), sa.Column("size_bytes", sa.Integer(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False), sa.PrimaryKeyConstraint("id"))


def downgrade() -> None:
    for table in ("geo_layers", "documents", "translations", "api_keys", "users"):
        op.drop_table(table)
