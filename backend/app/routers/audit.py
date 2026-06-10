# routers/audit.py — THIN ROUTER (Phase 3)
# Zero DB code. Routers only call service functions.

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import audit_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/", response_model=list[schemas.AuditLogOut])
def get_audit_logs(
    limit: int = Query(default=100, le=500),
    db:    Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Admin only — view full system audit trail.
    Every action (task created, approval submitted, doc uploaded etc.) is logged here.
    Logs are immutable — cannot be edited or deleted.
    """
    return audit_service.get_all_logs(db, current_user, limit=limit)
