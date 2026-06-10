import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException
from fastapi_pagination.ext.sqlalchemy import paginate as sa_paginate
from app import models

logger = logging.getLogger(__name__)

def _check_admin(current_user):
    if current_user.role != "admin": raise HTTPException(403,"Admin access required")

def get_all_paginated(db, current_user):
    _check_admin(current_user)
    stmt = select(models.AuditLog).options(selectinload(models.AuditLog.actor)).order_by(models.AuditLog.timestamp.desc())
    return sa_paginate(db, stmt)

def get_by_id(db, log_id, current_user):
    _check_admin(current_user)
    log = db.execute(select(models.AuditLog).options(selectinload(models.AuditLog.actor))
        .where(models.AuditLog.id == log_id)).scalar_one_or_none()
    if not log: raise HTTPException(404,"Audit log not found")
    return log

def get_by_module(db, module_name, current_user):
    _check_admin(current_user)
    stmt = (select(models.AuditLog).options(selectinload(models.AuditLog.actor))
            .where((models.AuditLog.module_name == module_name)|(models.AuditLog.entity == module_name))
            .order_by(models.AuditLog.timestamp.desc()))
    return sa_paginate(db, stmt)

def get_by_user(db, user_id, current_user):
    _check_admin(current_user)
    stmt = (select(models.AuditLog).options(selectinload(models.AuditLog.actor))
            .where(models.AuditLog.user_id == user_id).order_by(models.AuditLog.timestamp.desc()))
    return sa_paginate(db, stmt)

def get_by_date_range(db, start_date, end_date, current_user):
    _check_admin(current_user)
    if end_date < start_date: raise HTTPException(400,"end_date must be after start_date")
    stmt = (select(models.AuditLog).options(selectinload(models.AuditLog.actor))
            .where(models.AuditLog.timestamp >= start_date, models.AuditLog.timestamp <= end_date)
            .order_by(models.AuditLog.timestamp.desc()))
    return sa_paginate(db, stmt)

def log_enhanced(db, user_id, action, entity, entity_id=None, detail=None,
                  module_name=None, action_type=None, record_id=None,
                  old_data=None, new_data=None, ip_address=None, user_agent=None):
    row = models.AuditLog(user_id=user_id, action=action, entity=entity, entity_id=entity_id,
        detail=detail, module_name=module_name or entity, action_type=action_type or action,
        record_id=record_id or entity_id, old_data=old_data, new_data=new_data,
        ip_address=ip_address, user_agent=user_agent)
    db.add(row); db.commit(); db.refresh(row); return row
