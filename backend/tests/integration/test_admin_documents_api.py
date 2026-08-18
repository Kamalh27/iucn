from __future__ import annotations

import io

import pytest

pytestmark = pytest.mark.integration


@pytest.fixture()
def uploads_dir(tmp_path, monkeypatch):
    from app.core.config import settings

    object.__setattr__(settings, "upload_dir", str(tmp_path))
    return tmp_path


def test_upload_document_requires_admin(client, user_headers, uploads_dir):
    files = {"file": ("report.pdf", io.BytesIO(b"%PDF-1.4 fake content"), "application/pdf")}
    response = client.post("/admin/documents", data={"title": "Report"}, files=files, headers=user_headers)
    assert response.status_code == 403


def test_upload_and_list_document(client, admin_headers, uploads_dir):
    files = {"file": ("report.pdf", io.BytesIO(b"%PDF-1.4 fake content"), "application/pdf")}
    upload = client.post("/admin/documents", data={"title": "Inception Report", "summary": "Draft"}, files=files, headers=admin_headers)
    assert upload.status_code == 201
    body = upload.json()
    assert body["title"] == "Inception Report"
    assert body["original_filename"] == "report.pdf"
    assert body["size_bytes"] == len(b"%PDF-1.4 fake content")

    stored_files = list(uploads_dir.iterdir())
    assert len(stored_files) == 1

    listing = client.get("/admin/documents", headers=admin_headers)
    assert listing.status_code == 200
    assert any(item["id"] == body["id"] for item in listing.json())


def test_upload_document_requires_title(client, admin_headers, uploads_dir):
    files = {"file": ("report.pdf", io.BytesIO(b"data"), "application/pdf")}
    response = client.post("/admin/documents", data={"title": "   "}, files=files, headers=admin_headers)
    assert response.status_code == 422


def test_delete_document_removes_file(client, admin_headers, uploads_dir):
    files = {"file": ("report.pdf", io.BytesIO(b"data"), "application/pdf")}
    created = client.post("/admin/documents", data={"title": "To delete"}, files=files, headers=admin_headers).json()

    assert len(list(uploads_dir.iterdir())) == 1
    response = client.delete(f"/admin/documents/{created['id']}", headers=admin_headers)
    assert response.status_code == 200
    assert len(list(uploads_dir.iterdir())) == 0


def test_delete_missing_document_returns_404(client, admin_headers):
    response = client.delete("/admin/documents/does-not-exist", headers=admin_headers)
    assert response.status_code == 404
