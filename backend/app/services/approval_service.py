# services/approval_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repository import audit_repository, notification_repository
from app import models, schemas

logger = logging.getLogger(__name__)
VALID_ACTIONS = ("approved", "rejected", "on_hold", "escalate")


def submit_approval(db: Session, data: schemas.ApprovalCreate, current_user: models.User):
    approval = models.Approval(title=data.title, description=data.description,
        requested_by_id=current_user.id, status="pending", current_level="manager")
    db.add(approval); db.commit(); db.refresh(approval)
    db.add(models.ApprovalHistory(approval_id=approval.id, action_by_id=current_user.id,
        action="submitted", comment="Approval request submitted"))
    db.commit(); db.refresh(approval)
    audit_repository.create(db, user_id=current_user.id, action="submitted_approval",
        entity="approval", entity_id=approval.id, detail=data.title)
    return approval


def list_approvals(db: Session, current_user: models.User):
    if current_user.role == "admin":
        stmt = select(models.Approval).order_by(models.Approval.created_at.desc())
    elif current_user.role == "manager":
        stmt = (select(models.Approval)
                .where((models.Approval.current_level == "manager") |
                       (models.Approval.requested_by_id == current_user.id))
                .order_by(models.Approval.created_at.desc()))
    else:
        stmt = (select(models.Approval)
                .where(models.Approval.requested_by_id == current_user.id)
                .order_by(models.Approval.created_at.desc()))
    return db.execute(stmt).scalars().all()


def process_action(db: Session, approval_id: int, action_data: schemas.ApprovalAction,
                    current_user: models.User):
    approval = db.execute(select(models.Approval).where(
        models.Approval.id == approval_id)).scalar_one_or_none()
    if not approval: raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail=f"Approval already '{approval.status}'")
    if current_user.role == "manager" and approval.current_level != "manager":
        raise HTTPException(status_code=403, detail="This approval is at admin level")
    action = action_data.action.lower()
    if action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Action must be one of: {', '.join(VALID_ACTIONS)}")
    if action == "rejected" and not action_data.comment:
        raise HTTPException(status_code=400, detail="A comment is required when rejecting")
    if action == "escalate" and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can escalate")
    if action == "escalate":
        approval.current_level = "admin"; approval.status = "pending"
    elif action == "on_hold":
        approval.status = "on_hold"
    else:
        approval.status = action
    approval.updated_at = datetime.utcnow()
    db.add(models.ApprovalHistory(approval_id=approval_id, action_by_id=current_user.id,
        action=action, comment=action_data.comment))
    db.commit(); db.refresh(approval)
    audit_repository.create(db, user_id=current_user.id, action=f"approval_{action}",
        entity="approval", entity_id=approval_id, detail=approval.title)
    if approval.requested_by_id != current_user.id:
        label = {"approved":"✅ approved","rejected":"❌ rejected",
                 "on_hold":"⏸ put on hold","escalate":"⬆ escalated"}.get(action, action)
        notification_repository.create(db, user_id=approval.requested_by_id,
            message=f'Your approval "{approval.title}" has been {label} by {current_user.name}')
    return approval


def get_history(db: Session, approval_id: int, current_user: models.User):
    approval = db.execute(select(models.Approval).where(
        models.Approval.id == approval_id)).scalar_one_or_none()
    if not approval: raise HTTPException(status_code=404, detail="Approval not found")
    if current_user.role == "employee" and approval.requested_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return db.execute(select(models.ApprovalHistory)
        .where(models.ApprovalHistory.approval_id == approval_id)
        .order_by(models.ApprovalHistory.created_at)).scalars().all()
