from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Document


class DocumentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.upload_dir = Path(settings.upload_dir)

    def list_documents(self) -> list[Document]:
        return list(self.db.scalars(select(Document).order_by(Document.created_at.desc())).all())

    async def create(self, *, title: str, summary: str | None, file: UploadFile) -> Document:
        clean_title = title.strip()
        if not clean_title:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title is required")
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A document file is required")

        self.upload_dir.mkdir(parents=True, exist_ok=True)
        stored_filename = f"{uuid4().hex}_{Path(file.filename).name}"
        destination = self.upload_dir / stored_filename
        size_bytes = 0
        try:
            with destination.open("wb") as output:
                while chunk := await file.read(1024 * 1024):
                    output.write(chunk)
                    size_bytes += len(chunk)
            document = Document(
                title=clean_title,
                summary=summary.strip() if summary and summary.strip() else None,
                original_filename=Path(file.filename).name,
                stored_filename=stored_filename,
                content_type=file.content_type,
                size_bytes=size_bytes,
            )
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)
            return document
        except Exception:
            destination.unlink(missing_ok=True)
            raise
        finally:
            await file.close()

    def delete(self, document_id: str) -> None:
        document = self.db.get(Document, document_id)
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        (self.upload_dir / document.stored_filename).unlink(missing_ok=True)
        self.db.delete(document)
        self.db.commit()

