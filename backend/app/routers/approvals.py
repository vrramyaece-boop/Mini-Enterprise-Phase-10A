# routers/approvals.py — THIN ROUTER (Phase 2 + Phase 3)
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_manager_or_admin
from app import models, schemas
from app.services import approval_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.post("/", response_model=schemas.ApprovalOut, status_code=201)
def submit_approval(body: schemas.ApprovalCreate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(get_current_user)):
    return approval_service.submit_approval(db, body, current_user)


@router.get("/", response_model=list[schemas.ApprovalOut])
def list_approvals(db: Session = Depends(get_db),
                   current_user: models.User = Depends(get_current_user)):
    return approval_service.list_approvals(db, current_user)


@router.patch("/{approval_id}/action", response_model=schemas.ApprovalOut)
def approval_action(approval_id: int, body: schemas.ApprovalAction,
                    db: Session = Depends(get_db),
                    current_user: models.User = Depends(require_manager_or_admin)):
    return approval_service.process_action(db, approval_id, body, current_user)


@router.get("/{approval_id}/history", response_model=list[schemas.ApprovalHistoryOut])
def get_history(approval_id: int, db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    return approval_service.get_history(db, approval_id, current_user)
