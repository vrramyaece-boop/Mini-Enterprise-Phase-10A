# services/notification_service.py
# Business logic for notification triggering and retrieval.
# Auto-triggered on: task assigned, approval actions, comments.

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repository import notification_repository
from app import models

logger = logging.getLogger(__name__)


# ── PUBLIC TRIGGER FUNCTIONS ──────────────────────────────────
# Called from other services (task, approval) automatically.

def notify_task_assigned(db: Session, task: models.Task,
                          assigned_by: models.User) -> None:
    """Notify the assignee when a task is assigned to them."""
    if not task.assigned_to_id:
        return
    if task.assigned_to_id == assigned_by.id:
        return  # don't notify yourself
    msg = (f"📋 You have been assigned task: \"{task.title}\" "
           f"by {assigned_by.name}")
    notification_repository.create(db, user_id=task.assigned_to_id, message=msg)
    logger.info(f"Notification sent to user {task.assigned_to_id}: task assigned")


def notify_approval_action(db: Session, approval: models.Approval,
                            action: str, actor: models.User) -> None:
    """
    Notify the requester when their approval is actioned.
    Also notify admins on escalation.
    """
    action_label = {
        "approved":  "✅ approved",
        "rejected":  "❌ rejected",
        "on_hold":   "⏸ put on hold",
        "escalate":  "⬆ escalated to Admin",
        "submitted": "📨 submitted",
    }.get(action, action)

    # Notify the requester
    if approval.requested_by_id != actor.id:
        msg = (f"Your approval request \"{approval.title}\" "
               f"has been {action_label} by {actor.name}")
        notification_repository.create(
            db, user_id=approval.requested_by_id, message=msg
        )
    logger.info(f"Approval notification sent for approval {approval.id}")


def notify_comment_added(db: Session, task: models.Task,
                          commenter: models.User) -> None:
    """
    Notify the task assignee and creator when a comment is added.
    Don't notify the commenter themselves.
    """
    targets = set()
    if task.assigned_to_id and task.assigned_to_id != commenter.id:
        targets.add(task.assigned_to_id)
    if task.created_by_id and task.created_by_id != commenter.id:
        targets.add(task.created_by_id)

    if targets:
        msg = (f"💬 {commenter.name} commented on task: \"{task.title}\"")
        notification_repository.create_bulk(db, list(targets), msg)
        logger.info(f"Comment notification sent to {targets} for task {task.id}")


def notify_document_uploaded(db: Session, task_id: int | None,
                              doc_name: str, uploader: models.User,
                              db_session: Session) -> None:
    """Notify task assignee/creator when a document is uploaded to their task."""
    if not task_id:
        return
    task = db_session.query(models.Task).filter(
        models.Task.id == task_id
    ).first()
    if not task:
        return
    targets = set()
    if task.assigned_to_id and task.assigned_to_id != uploader.id:
        targets.add(task.assigned_to_id)
    if task.created_by_id and task.created_by_id != uploader.id:
        targets.add(task.created_by_id)
    if targets:
        msg = f"📎 {uploader.name} uploaded \"{doc_name}\" to task \"{task.title}\""
        notification_repository.create_bulk(db, list(targets), msg)


# ── USER-FACING FUNCTIONS ─────────────────────────────────────

def get_notifications(db: Session, current_user: models.User,
                       unread_only: bool = False):
    return notification_repository.get_for_user(
        db, current_user.id, unread_only=unread_only
    )


def mark_as_read(db: Session, notif_id: int,
                  current_user: models.User):
    notif = notification_repository.mark_read(db, notif_id, current_user.id)
    if not notif:
        raise HTTPException(
            status_code=404,
            detail="Notification not found or does not belong to you"
        )
    return notif


def mark_all_as_read(db: Session, current_user: models.User) -> dict:
    count = notification_repository.mark_all_read(db, current_user.id)
    return {"marked_read": count}


def get_unread_count(db: Session, current_user: models.User) -> int:
    return notification_repository.count_unread(db, current_user.id)
