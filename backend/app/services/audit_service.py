# services/audit_service.py
# Business logic for audit log access.
# Audit logs are read-only via API — only services can write them.

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repository import audit_repository
from app import models

logger = logging.getLogger(__name__)


def get_all_logs(db: Session, current_user: models.User,
                 limit: int = 100):
    """Admin only — view all system audit logs."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    logger.info(f"Audit logs requested by {current_user.email}")
    return audit_repository.get_all(db, limit=limit)


def log_action(db: Session, user_id: int, action: str,
               entity: str, entity_id: int | None = None,
               detail: str | None = None):
    """
    Convenience wrapper — called from every service after any action.
    This is the single entry point for writing audit rows.
    """
    return audit_repository.create(
        db, user_id=user_id, action=action,
        entity=entity, entity_id=entity_id, detail=detail,
    )


def get_recent_feed(db: Session, limit: int = 20) -> list[str]:
    """
    Returns recent actions as human-readable strings for the activity feed.
    Example: ["Alice created task #5", "Bob approved request #3"]
    """
    logs = audit_repository.get_recent(db, limit=limit)
    feed = []
    for log in logs:
        actor_name = log.actor.name if log.actor else f"User #{log.user_id}"
        action_str = log.action.replace("_", " ")
        detail_str = f" — {log.detail}" if log.detail else ""
        feed.append(f"{actor_name} {action_str} {log.entity} #{log.entity_id}{detail_str}")
    return feed
