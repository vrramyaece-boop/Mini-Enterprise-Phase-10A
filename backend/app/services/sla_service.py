import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException
from app import models, schemas

logger = logging.getLogger(__name__)

def create_sla_rule(db, data, current_user):
    if current_user.role != "admin": raise HTTPException(403, "Admin access required")
    rule = models.SLARule(module_name=data.module_name, priority=data.priority,
        allowed_hours=data.allowed_hours, escalation_enabled=data.escalation_enabled,
        escalation_after_hours=data.escalation_after_hours, created_by=current_user.id)
    db.add(rule); db.commit(); db.refresh(rule); return rule

def list_sla_rules(db):
    return db.execute(select(models.SLARule).order_by(models.SLARule.module_name)).scalars().all()

def get_sla_rule(db, rule_id):
    r = db.execute(select(models.SLARule).where(models.SLARule.id == rule_id)).scalar_one_or_none()
    if not r: raise HTTPException(404, "SLA rule not found")
    return r

def update_sla_rule(db, rule_id, data, current_user):
    if current_user.role != "admin": raise HTTPException(403, "Admin access required")
    rule = get_sla_rule(db, rule_id)
    if data.module_name is not None:            rule.module_name = data.module_name
    if data.priority is not None:               rule.priority = data.priority
    if data.allowed_hours is not None:          rule.allowed_hours = data.allowed_hours
    if data.escalation_enabled is not None:     rule.escalation_enabled = data.escalation_enabled
    if data.escalation_after_hours is not None: rule.escalation_after_hours = data.escalation_after_hours
    if data.is_active is not None:              rule.is_active = data.is_active
    db.commit(); db.refresh(rule); return rule

def disable_sla_rule(db, rule_id, current_user):
    if current_user.role != "admin": raise HTTPException(403, "Admin access required")
    rule = get_sla_rule(db, rule_id); rule.is_active = False; db.commit()
    return {"message": f"SLA rule {rule_id} disabled"}

def _find_rule(db, module_name, priority):
    return db.execute(select(models.SLARule).where(
        models.SLARule.module_name == module_name, models.SLARule.priority == priority,
        models.SLARule.is_active == True)).scalar_one_or_none()

def start_sla_tracking(db, module_name, record_id, priority, current_user):
    rule = _find_rule(db, module_name, priority)
    if not rule: raise HTTPException(404, f"No active SLA rule for module='{module_name}' priority='{priority}'")
    existing = db.execute(select(models.SLATracking).where(
        models.SLATracking.module_name == module_name, models.SLATracking.record_id == record_id,
        models.SLATracking.status == "active")).scalar_one_or_none()
    if existing: raise HTTPException(400, f"SLA tracking already active for {module_name} #{record_id}")
    now = datetime.utcnow(); due_time = now + timedelta(hours=rule.allowed_hours)
    tracking = models.SLATracking(module_name=module_name, record_id=record_id,
        sla_rule_id=rule.id, start_time=now, due_time=due_time, status="active")
    db.add(tracking); db.commit(); db.refresh(tracking)
    _update_sla_fields(db, module_name, record_id, due_time, "on_track")
    return tracking

def _update_sla_fields(db, module_name, record_id, due_time, sla_status):
    if module_name == "task":
        t = db.execute(select(models.Task).where(models.Task.id == record_id)).scalar_one_or_none()
        if t: t.sla_status = sla_status; t.sla_due_time = due_time; db.commit()
    elif module_name == "approval":
        a = db.execute(select(models.Approval).where(models.Approval.id == record_id)).scalar_one_or_none()
        if a: a.sla_status = sla_status; a.sla_due_time = due_time; db.commit()

def complete_sla_tracking(db, tracking_id, data, current_user):
    tracking = db.execute(select(models.SLATracking).where(
        models.SLATracking.id == tracking_id)).scalar_one_or_none()
    if not tracking: raise HTTPException(404, "SLA tracking not found")
    now = datetime.utcnow(); is_breach = now > tracking.due_time
    tracking.completed_time = now; tracking.status = "breached" if is_breach else "completed"
    tracking.breach_reason = data.breach_reason if is_breach else None
    db.commit(); db.refresh(tracking)
    _update_sla_fields(db, tracking.module_name, tracking.record_id, tracking.due_time, tracking.status)
    if is_breach and tracking.module_name == "task":
        t = db.execute(select(models.Task).where(models.Task.id == tracking.record_id)).scalar_one_or_none()
        if t: t.is_sla_breached = True; db.commit()
    return tracking

def get_active_sla(db):
    return db.execute(select(models.SLATracking).options(selectinload(models.SLATracking.sla_rule))
        .where(models.SLATracking.status == "active")
        .order_by(models.SLATracking.due_time)).scalars().all()

def get_breached_sla(db):
    now = datetime.utcnow()
    return db.execute(select(models.SLATracking).options(selectinload(models.SLATracking.sla_rule))
        .where((models.SLATracking.status == "breached") |
               ((models.SLATracking.status == "active") & (models.SLATracking.due_time < now)))
        .order_by(models.SLATracking.due_time)).scalars().all()

def get_sla_for_record(db, module_name, record_id):
    r = db.execute(select(models.SLATracking).options(selectinload(models.SLATracking.sla_rule))
        .where(models.SLATracking.module_name == module_name, models.SLATracking.record_id == record_id)
        .order_by(models.SLATracking.created_at.desc())).scalars().first()
    if not r: raise HTTPException(404, "No SLA tracking found")
    return r
