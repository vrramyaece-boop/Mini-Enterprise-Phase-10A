# routers/documents.py — THIN ROUTER (Phase 3)
# Zero DB code. Zero business logic.
# Only: parse request → call service → return response.

import os
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import document_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=schemas.DocumentOut, status_code=201)
async def upload_document(
    file:    UploadFile = File(...),
    task_id: int | None = Form(default=None),
    db:      Session    = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Upload a document. Auto-increments version if same filename+task exists.
    Allowed: PDF, images, Word, Excel, CSV, ZIP (max 10 MB).
    """
    return await document_service.upload_document(db, file, task_id, current_user)


@router.get("/task/{task_id}", response_model=list[schemas.DocumentOut])
def get_task_documents(
    task_id: int,
    db:      Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """All documents linked to a specific task."""
    return document_service.get_documents_for_task(db, task_id, current_user)


@router.get("/", response_model=list[schemas.DocumentOut])
def list_documents(
    db:      Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List documents. Admin sees all; others see their own uploads."""
    return document_service.list_documents(db, current_user)


@router.get("/{doc_id}", response_model=schemas.DocumentOut)
def get_document(
    doc_id:  int,
    db:      Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get document metadata by ID."""
    return document_service.get_document(db, doc_id, current_user)


@router.get("/{doc_id}/download")
def download_document(
    doc_id:  int,
    db:      Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Download the actual file."""
    doc = document_service.get_document(db, doc_id, current_user)
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.mime_type or "application/octet-stream",
    )
