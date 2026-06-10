import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException
from app import models, schemas

logger = logging.getLogger(__name__)

def create_escalation(db, data, current_user):
    if current_user.role not in ("admin","manager"): raise HTTPException(403,"Manager or Admin access required")
    approval = db.execute(select(models.Approval).where(models.Approval.id == data.approval_id)).scalar_one_or_none()
    if not approval: raise HTTPException(404,"Approval not found")
    if approval.status in ("approved","rejected"): raise HTTPException(400,f"Cannot escalate — already '{approval.status}'")
    target = db.execute(select(models.User).where(models.User.id == data.escalated_to)).scalar_one_or_none()
    if not target: raise HTTPException(404,"Escalation target not found")
    esc = models.ApprovalEscalation(approval_id=data.approval_id, escalated_from=current_user.id,
        escalated_to=data.escalated_to, reason=data.reason, escalation_level=data.escalation_level, status="pending")
    db.add(esc)
    approval.is_escalated = True; approval.current_escalation_to = data.escalated_to; approval.current_level = "admin"
    db.add(models.Notification(user_id=data.escalated_to,
        message=f"⬆ Approval \"{approval.title}\" escalated to you by {current_user.name}. Reason: {data.reason}"))
    db.commit(); db.refresh(esc); return esc

def list_escalations(db, current_user):
    stmt = (select(models.ApprovalEscalation)
            .options(selectinload(models.ApprovalEscalation.approval),
                     selectinload(models.ApprovalEscalation.from_user),
                     selectinload(models.ApprovalEscalation.to_user))
            .order_by(models.ApprovalEscalation.escalated_at.desc()))
    if current_user.role == "manager":
        stmt = stmt.where((models.ApprovalEscalation.escalated_from == current_user.id) |
                          (models.ApprovalEscalation.escalated_to   == current_user.id))
    return db.execute(stmt).scalars().all()

def list_pending_escalations(db, current_user):
    stmt = (select(models.ApprovalEscalation)
            .options(selectinload(models.ApprovalEscalation.approval),
                     selectinload(models.ApprovalEscalation.to_user))
            .where(models.ApprovalEscalation.status == "pending")
            .order_by(models.ApprovalEscalation.escalated_at))
    if current_user.role == "manager":
        stmt = stmt.where((models.ApprovalEscalation.escalated_from == current_user.id) |
                          (models.ApprovalEscalation.escalated_to   == current_user.id))
    return db.execute(stmt).scalars().all()

def get_escalation_history(db, approval_id):
    return db.execute(select(models.ApprovalEscalation)
        .options(selectinload(models.ApprovalEscalation.from_user),
                 selectinload(models.ApprovalEscalation.to_user))
        .where(models.ApprovalEscalation.approval_id == approval_id)
        .order_by(models.ApprovalEscalation.escalated_at)).scalars().all()

def resolve_escalation(db, escalation_id, current_user):
    esc = db.execute(select(models.ApprovalEscalation).where(
        models.ApprovalEscalation.id == escalation_id)).scalar_one_or_none()
    if not esc: raise HTTPException(404,"Escalation not found")
    if esc.status != "pending": raise HTTPException(400,f"Already '{esc.status}'")
    esc.status = "resolved"; esc.resolved_at = datetime.utcnow(); db.commit(); db.refresh(esc); return esc

def cancel_escalation(db, escalation_id, current_user):
    esc = db.execute(select(models.ApprovalEscalation).where(
        models.ApprovalEscalation.id == escalation_id)).scalar_one_or_none()
    if not esc: raise HTTPException(404,"Escalation not found")
    if esc.status != "pending": raise HTTPException(400,"Can only cancel pending escalations")
    esc.status = "cancelled"; esc.resolved_at = datetime.utcnow(); db.commit(); db.refresh(esc); return esc

def create_delegation(db, data, current_user):
    if current_user.role not in ("admin","manager"): raise HTTPException(403,"Manager or Admin access required")
    if data.delegatee_id == current_user.id: raise HTTPException(400,"Cannot delegate to yourself")
    if data.end_date <= data.start_date: raise HTTPException(400,"end_date must be after start_date")
    if not db.execute(select(models.User).where(models.User.id == data.delegatee_id)).scalar_one_or_none():
        raise HTTPException(404,"Delegatee not found")
    d = models.ApprovalDelegation(delegator_id=current_user.id, delegatee_id=data.delegatee_id,
        start_date=data.start_date, end_date=data.end_date, reason=data.reason, is_active=True)
    db.add(d)
    db.add(models.Notification(user_id=data.delegatee_id,
        message=f"📋 {current_user.name} delegated approval rights to you "
                f"from {data.start_date.strftime('%d %b')} to {data.end_date.strftime('%d %b')}"))
    db.commit(); db.refresh(d); return d

def get_my_delegations(db, current_user):
    return db.execute(select(models.ApprovalDelegation)
        .options(selectinload(models.ApprovalDelegation.delegatee),
                 selectinload(models.ApprovalDelegation.delegator))
        .where((models.ApprovalDelegation.delegator_id == current_user.id) |
               (models.ApprovalDelegation.delegatee_id == current_user.id))
        .order_by(models.ApprovalDelegation.created_at.desc())).scalars().all()

def get_active_delegations(db, current_user):
    now = datetime.utcnow()
    stmt = (select(models.ApprovalDelegation)
            .options(selectinload(models.ApprovalDelegation.delegatee),
                     selectinload(models.ApprovalDelegation.delegator))
            .where(models.ApprovalDelegation.is_active == True,
                   models.ApprovalDelegation.start_date <= now,
                   models.ApprovalDelegation.end_date   >= now)
            .order_by(models.ApprovalDelegation.end_date))
    if current_user.role == "manager":
        stmt = stmt.where((models.ApprovalDelegation.delegator_id == current_user.id) |
                          (models.ApprovalDelegation.delegatee_id == current_user.id))
    return db.execute(stmt).scalars().all()

def cancel_delegation(db, delegation_id, current_user):
    d = db.execute(select(models.ApprovalDelegation).where(
        models.ApprovalDelegation.id == delegation_id)).scalar_one_or_none()
    if not d: raise HTTPException(404,"Delegation not found")
    if d.delegator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403,"You can only cancel your own delegations")
    d.is_active = False; db.commit(); db.refresh(d); return d
