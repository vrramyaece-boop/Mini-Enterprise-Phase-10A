from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import escalation_service

router = APIRouter(tags=["Phase 8 — Escalation & Delegation"])

@router.post("/approval-escalations", response_model=schemas.ApprovalEscalationOut, status_code=201)
def create_escalation(body: schemas.ApprovalEscalationCreate, db: Session=Depends(get_db),
                       current_user: models.User=Depends(get_current_user)):
    return escalation_service.create_escalation(db, body, current_user)

@router.get("/approval-escalations",  response_model=list[schemas.ApprovalEscalationOut])
def list_escalations(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return escalation_service.list_escalations(db, current_user)

@router.get("/approval-escalations/pending", response_model=list[schemas.ApprovalEscalationOut])
def list_pending(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return escalation_service.list_pending_escalations(db, current_user)

@router.get("/approval-escalations/approval/{approval_id}", response_model=list[schemas.ApprovalEscalationOut])
def escalation_history(approval_id: int, db: Session=Depends(get_db),
                        current_user: models.User=Depends(get_current_user)):
    return escalation_service.get_escalation_history(db, approval_id)

@router.put("/approval-escalations/{escalation_id}/resolve", response_model=schemas.ApprovalEscalationOut)
def resolve_escalation(escalation_id: int, db: Session=Depends(get_db),
                        current_user: models.User=Depends(get_current_user)):
    return escalation_service.resolve_escalation(db, escalation_id, current_user)

@router.put("/approval-escalations/{escalation_id}/cancel", response_model=schemas.ApprovalEscalationOut)
def cancel_escalation(escalation_id: int, db: Session=Depends(get_db),
                       current_user: models.User=Depends(get_current_user)):
    return escalation_service.cancel_escalation(db, escalation_id, current_user)

@router.post("/approval-delegations", response_model=schemas.ApprovalDelegationOut, status_code=201)
def create_delegation(body: schemas.ApprovalDelegationCreate, db: Session=Depends(get_db),
                       current_user: models.User=Depends(get_current_user)):
    return escalation_service.create_delegation(db, body, current_user)

@router.get("/approval-delegations/me",     response_model=list[schemas.ApprovalDelegationOut])
def my_delegations(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return escalation_service.get_my_delegations(db, current_user)

@router.get("/approval-delegations/active", response_model=list[schemas.ApprovalDelegationOut])
def active_delegations(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return escalation_service.get_active_delegations(db, current_user)

@router.put("/approval-delegations/{delegation_id}/cancel", response_model=schemas.ApprovalDelegationOut)
def cancel_delegation(delegation_id: int, db: Session=Depends(get_db),
                       current_user: models.User=Depends(get_current_user)):
    return escalation_service.cancel_delegation(db, delegation_id, current_user)
