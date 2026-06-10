from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import sla_service

router = APIRouter(tags=["Phase 8 — SLA"])

@router.post("/sla-rules", response_model=schemas.SLARuleOut, status_code=201)
def create_sla_rule(body: schemas.SLARuleCreate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(get_current_user)):
    return sla_service.create_sla_rule(db, body, current_user)

@router.get("/sla-rules", response_model=list[schemas.SLARuleOut])
def list_sla_rules(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return sla_service.list_sla_rules(db)

@router.get("/sla-rules/{rule_id}", response_model=schemas.SLARuleOut)
def get_sla_rule(rule_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return sla_service.get_sla_rule(db, rule_id)

@router.put("/sla-rules/{rule_id}", response_model=schemas.SLARuleOut)
def update_sla_rule(rule_id: int, body: schemas.SLARuleUpdate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(get_current_user)):
    return sla_service.update_sla_rule(db, rule_id, body, current_user)

@router.delete("/sla-rules/{rule_id}")
def disable_sla_rule(rule_id: int, db: Session = Depends(get_db),
                     current_user: models.User = Depends(get_current_user)):
    return sla_service.disable_sla_rule(db, rule_id, current_user)

@router.post("/sla-tracking/tasks/{task_id}", response_model=schemas.SLATrackingOut, status_code=201)
def start_task_sla(task_id: int, db: Session = Depends(get_db),
                   current_user: models.User = Depends(get_current_user)):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(404, "Task not found")
    return sla_service.start_sla_tracking(db, "task", task_id, task.priority, current_user)

@router.post("/sla-tracking/approvals/{approval_id}", response_model=schemas.SLATrackingOut, status_code=201)
def start_approval_sla(approval_id: int, db: Session = Depends(get_db),
                        current_user: models.User = Depends(get_current_user)):
    a = db.execute(select(models.Approval).where(models.Approval.id == approval_id)).scalar_one_or_none()
    if not a: raise HTTPException(404, "Approval not found")
    return sla_service.start_sla_tracking(db, "approval", approval_id, "medium", current_user)

@router.put("/sla-tracking/{tracking_id}/complete", response_model=schemas.SLATrackingOut)
def complete_sla(tracking_id: int, body: schemas.SLACompleteRequest, db: Session = Depends(get_db),
                 current_user: models.User = Depends(get_current_user)):
    return sla_service.complete_sla_tracking(db, tracking_id, body, current_user)

@router.get("/sla-tracking/active",   response_model=list[schemas.SLATrackingOut])
def get_active_sla(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return sla_service.get_active_sla(db)

@router.get("/sla-tracking/breached", response_model=list[schemas.SLATrackingOut])
def get_breached_sla(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return sla_service.get_breached_sla(db)

@router.get("/sla-tracking/record/{module_name}/{record_id}", response_model=schemas.SLATrackingOut)
def get_sla_for_record(module_name: str, record_id: int, db: Session=Depends(get_db),
                        current_user: models.User=Depends(get_current_user)):
    return sla_service.get_sla_for_record(db, module_name, record_id)
