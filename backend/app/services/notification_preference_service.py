import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models, schemas

logger = logging.getLogger(__name__)

def _get_or_create(db, user_id):
    p = db.execute(select(models.NotificationPreference).where(
        models.NotificationPreference.user_id == user_id)).scalar_one_or_none()
    if not p:
        p = models.NotificationPreference(user_id=user_id); db.add(p); db.commit(); db.refresh(p)
    return p

def get_my_preferences(db, current_user): return _get_or_create(db, current_user.id)

def update_my_preferences(db, data, current_user):
    p = _get_or_create(db, current_user.id)
    if data.in_app_enabled is not None:           p.in_app_enabled           = data.in_app_enabled
    if data.email_enabled is not None:            p.email_enabled            = data.email_enabled
    if data.task_notifications is not None:       p.task_notifications       = data.task_notifications
    if data.approval_notifications is not None:   p.approval_notifications   = data.approval_notifications
    if data.escalation_notifications is not None: p.escalation_notifications = data.escalation_notifications
    if data.document_notifications is not None:   p.document_notifications   = data.document_notifications
    db.commit(); db.refresh(p); return p

def create_default_preferences(db, user_id, current_user):
    if current_user.role != "admin": raise HTTPException(403,"Admin access required")
    if not db.execute(select(models.User).where(models.User.id == user_id)).scalar_one_or_none():
        raise HTTPException(404,"User not found")
    return _get_or_create(db, user_id)

def user_wants_notification(db, user_id, notification_type):
    p = db.execute(select(models.NotificationPreference).where(
        models.NotificationPreference.user_id == user_id)).scalar_one_or_none()
    if not p: return True
    if not p.in_app_enabled: return False
    return {"task":p.task_notifications,"approval":p.approval_notifications,
            "escalation":p.escalation_notifications,"document":p.document_notifications}.get(notification_type,True)
