# services/document_service.py
# Business logic for document upload, versioning, download.
# Calls document_repository + audit_repository. Router stays thin.

import os
import logging
import uuid
from fastapi import HTTPException, UploadFile

from app.repository import document_repository, audit_repository
from app import models

logger = logging.getLogger(__name__)

UPLOAD_DIR   = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
MAX_SIZE_MB  = 10
ALLOWED_MIME = {
    "application/pdf", "image/png", "image/jpeg", "image/gif",
    "text/plain", "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
}

os.makedirs(UPLOAD_DIR, exist_ok=True)


async def upload_document(db, file: UploadFile, task_id: int | None,
                           current_user: models.User):
    """
    Validate → save file to disk → auto-increment version → write DB row.
    File validation: size limit + allowed MIME types (spec §6 security).
    """
    # File validation
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {MAX_SIZE_MB} MB."
        )
    if file.content_type and file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not allowed."
        )

    # Version increment — if same filename+task already exists, bump version
    existing_version = document_repository.get_latest_version(
        db, file_name=file.filename, task_id=task_id
    )
    new_version = existing_version + 1

    # Save file to disk with unique name to prevent collisions
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path   = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(content)

    # Write DB record
    doc = document_repository.create(
        db,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        version=new_version,
        uploaded_by=current_user.id,
        task_id=task_id,
    )

    # Audit log
    audit_repository.create(
        db, user_id=current_user.id,
        action="uploaded_document", entity="document", entity_id=doc.id,
        detail=f"{file.filename} (v{new_version})"
    )
    logger.info(f"Doc {doc.id} uploaded by {current_user.email}: {file.filename} v{new_version}")
    return doc


def get_document(db, doc_id: int, current_user: models.User):
    """Fetch one document with access control."""
    doc = document_repository.get_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Employee: can only access own uploads or task docs
    if current_user.role == "employee":
        if doc.uploaded_by != current_user.id:
            if not (doc.task_id and _user_has_task_access(db, doc.task_id, current_user)):
                raise HTTPException(status_code=403, detail="Access denied")
    return doc


def get_documents_for_task(db, task_id: int, current_user: models.User):
    """All documents linked to a specific task."""
    return document_repository.get_by_task(db, task_id)


def list_documents(db, current_user: models.User):
    """Role-based document listing."""
    if current_user.role == "admin":
        return document_repository.get_all(db)
    else:
        return document_repository.get_by_uploader(db, current_user.id)


def _user_has_task_access(db, task_id: int, current_user: models.User) -> bool:
    from sqlalchemy import select as _sel
    from app import models as _m
    task = db.execute(_sel(_m.Task).where(_m.Task.id == task_id)).scalar_one_or_none()
    if not task: return False
    return task.assigned_to_id == current_user.id
