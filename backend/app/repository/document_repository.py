# repository/document_repository.py — SQLAlchemy 2.0: select() + execute()
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app import models

logger = logging.getLogger(__name__)


def get_by_id(db: Session, doc_id: int) -> models.Document | None:
    return db.execute(
        select(models.Document)
        .options(selectinload(models.Document.uploader))
        .where(models.Document.id == doc_id)
    ).scalar_one_or_none()


def get_by_task(db: Session, task_id: int) -> list[models.Document]:
    return db.execute(
        select(models.Document)
        .options(selectinload(models.Document.uploader))
        .where(models.Document.task_id == task_id)
        .order_by(models.Document.created_at.desc())
    ).scalars().all()


def get_latest_version(db: Session, file_name: str, task_id: int | None) -> int:
    stmt = select(models.Document).where(models.Document.file_name == file_name)
    if task_id:
        stmt = stmt.where(models.Document.task_id == task_id)
    stmt = stmt.order_by(models.Document.version.desc())
    last = db.execute(stmt).scalars().first()
    return last.version if last else 0


def create(db: Session, file_name: str, file_path: str,
           file_size: int | None, mime_type: str | None,
           version: int, uploaded_by: int,
           task_id: int | None) -> models.Document:
    doc = models.Document(file_name=file_name, file_path=file_path,
                           file_size=file_size, mime_type=mime_type,
                           version=version, uploaded_by=uploaded_by, task_id=task_id)
    db.add(doc); db.commit(); db.refresh(doc)
    logger.info(f"Document {doc.id} created: {file_name} v{version}")
    return doc


def get_all(db: Session) -> list[models.Document]:
    return db.execute(
        select(models.Document)
        .options(selectinload(models.Document.uploader))
        .order_by(models.Document.created_at.desc())
    ).scalars().all()


def get_by_uploader(db: Session, user_id: int) -> list[models.Document]:
    return db.execute(
        select(models.Document)
        .options(selectinload(models.Document.uploader))
        .where(models.Document.uploaded_by == user_id)
        .order_by(models.Document.created_at.desc())
    ).scalars().all()
