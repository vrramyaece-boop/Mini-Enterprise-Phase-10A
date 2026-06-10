# routers/notifications.py — THIN ROUTER (Phase 3)
# Zero DB code. Routers only call service functions.

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import notification_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[schemas.NotificationOut])
def get_notifications(
    unread_only: bool    = Query(default=False),
    db:          Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get notifications for the current user.
    Pass ?unread_only=true to get only unread ones.
    Auto-triggered on: task assigned, approval actioned, comment added.
    """
    return notification_service.get_notifications(db, current_user, unread_only)


@router.get("/unread-count")
def unread_count(
    db:   Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Quick count of unread notifications — used by the notification bell."""
    count = notification_service.get_unread_count(db, current_user)
    return {"unread_count": count}


@router.patch("/{notif_id}/read", response_model=schemas.NotificationOut)
def mark_read(
    notif_id:    int,
    db:          Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    return notification_service.mark_as_read(db, notif_id, current_user)


@router.patch("/mark-all-read")
def mark_all_read(
    db:   Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark all of the current user's notifications as read."""
    return notification_service.mark_all_as_read(db, current_user)
