# services/activity_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException
from app.services.pagination_service import paginate
from app import models

logger = logging.getLogger(__name__)


def log_activity(db: Session, user_id: int, entity_type: str, entity_id: int,
                 entity_name, action: str, before_val=None, after_val=None, description=None):
    row = models.ActivityLog(user_id=user_id, entity_type=entity_type, entity_id=entity_id,
        entity_name=entity_name, action=action, before_val=before_val,
        after_val=after_val, description=description)
    db.add(row); db.commit(); db.refresh(row)
    return row


def get_activity_logs_paginated(db: Session, current_user: models.User,
                                  page: int, page_size: int, entity_type=None) -> dict:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    stmt = (select(models.ActivityLog)
            .options(selectinload(models.ActivityLog.actor))
            .order_by(models.ActivityLog.timestamp.desc()))
    if entity_type:
        stmt = stmt.where(models.ActivityLog.entity_type == entity_type)
    return paginate(db, stmt, page, page_size)


def get_entity_history(db: Session, entity_type: str, entity_id: int) -> list:
    return db.execute(
        select(models.ActivityLog)
        .options(selectinload(models.ActivityLog.actor))
        .where(models.ActivityLog.entity_type == entity_type,
               models.ActivityLog.entity_id   == entity_id)
        .order_by(models.ActivityLog.timestamp.desc())
    ).scalars().all()


def get_recent_activity(db: Session, limit: int = 20) -> list:
    return db.execute(
        select(models.ActivityLog)
        .options(selectinload(models.ActivityLog.actor))
        .order_by(models.ActivityLog.timestamp.desc())
        .limit(limit)
    ).scalars().all()
