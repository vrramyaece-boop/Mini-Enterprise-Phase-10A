# services/role_dashboard_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from app import models

logger = logging.getLogger(__name__)


def get_employee_dashboard(db: Session, current_user: models.User) -> dict:
    tasks = db.execute(
        select(models.Task).where(models.Task.assigned_to_id == current_user.id)
        .options(selectinload(models.Task.assignee))
    ).scalars().all()
    total = len(tasks); done = sum(1 for t in tasks if t.status == "done")
    return {
        "assigned_tasks":   tasks,
        "pending_requests": db.execute(select(func.count()).select_from(models.Approval)
            .where(models.Approval.requested_by_id == current_user.id,
                   models.Approval.status == "pending")).scalar_one(),
        "my_comments":      db.execute(select(func.count()).select_from(models.Comment)
            .where(models.Comment.user_id == current_user.id)).scalar_one(),
        "my_notifications": db.execute(select(func.count()).select_from(models.Notification)
            .where(models.Notification.user_id == current_user.id,
                   models.Notification.is_read == False)).scalar_one(),
        "completion_rate":  round((done / total) * 100, 1) if total else 0.0,
        "task_breakdown": {
            "todo":        sum(1 for t in tasks if t.status == "todo"),
            "in_progress": sum(1 for t in tasks if t.status == "in_progress"),
            "review":      sum(1 for t in tasks if t.status == "review"),
            "done":        done,
        },
    }


def get_manager_dashboard(db: Session, current_user: models.User) -> dict:
    from app.services.activity_service import get_recent_activity
    team_tasks = db.execute(
        select(models.Task).where(models.Task.created_by_id == current_user.id)
        .options(selectinload(models.Task.assignee))
    ).scalars().all()
    now        = datetime.utcnow()
    total      = len(team_tasks); done = sum(1 for t in team_tasks if t.status == "done")
    member_ids = {t.assigned_to_id for t in team_tasks if t.assigned_to_id}
    approval_rows = db.execute(select(models.Approval)
        .where(models.Approval.requested_by_id == current_user.id)).scalars().all()
    return {
        "team_tasks":        team_tasks,
        "pending_approvals": db.execute(select(func.count()).select_from(models.Approval)
            .where(models.Approval.status == "pending",
                   models.Approval.current_level == "manager")).scalar_one(),
        "team_members":      len(member_ids),
        "overdue_tasks":     sum(1 for t in team_tasks
            if t.due_date and t.due_date < now and t.status != "done"),
        "team_completion":   round((done / total) * 100, 1) if total else 0.0,
        "approval_summary": {
            "pending":  sum(1 for a in approval_rows if a.status == "pending"),
            "approved": sum(1 for a in approval_rows if a.status == "approved"),
            "rejected": sum(1 for a in approval_rows if a.status == "rejected"),
        },
        "recent_activity": get_recent_activity(db, limit=10),
    }


def get_admin_dashboard(db: Session, current_user: models.User) -> dict:
    from app.websocket.connection_manager import manager as ws_manager
    from app.services.cache_service import get_cache_stats
    user_rows    = db.execute(select(models.User)).scalars().all()
    task_rows    = db.execute(select(models.Task)).scalars().all()
    recent_audit = db.execute(
        select(models.AuditLog).options(selectinload(models.AuditLog.actor))
        .order_by(models.AuditLog.timestamp.desc()).limit(10)
    ).scalars().all()
    return {
        "total_users":       db.execute(select(func.count()).select_from(models.User)).scalar_one(),
        "total_tasks":       db.execute(select(func.count()).select_from(models.Task)).scalar_one(),
        "total_approvals":   db.execute(select(func.count()).select_from(models.Approval)).scalar_one(),
        "total_documents":   db.execute(select(func.count()).select_from(models.Document)).scalar_one(),
        "system_health": {
            "db_status":           "healthy",
            "cache_stats":          get_cache_stats(),
            "active_ws_sessions":   ws_manager.active_connection_count(),
            "total_audit_logs":     db.execute(select(func.count()).select_from(models.AuditLog)).scalar_one(),
            "total_activity_logs":  db.execute(select(func.count()).select_from(models.ActivityLog)).scalar_one(),
        },
        "user_breakdown": {
            "admin":    sum(1 for u in user_rows if u.role == "admin"),
            "manager":  sum(1 for u in user_rows if u.role == "manager"),
            "employee": sum(1 for u in user_rows if u.role == "employee"),
        },
        "task_status_dist": {
            "todo":        sum(1 for t in task_rows if t.status == "todo"),
            "in_progress": sum(1 for t in task_rows if t.status == "in_progress"),
            "review":      sum(1 for t in task_rows if t.status == "review"),
            "done":        sum(1 for t in task_rows if t.status == "done"),
        },
        "recent_audit_logs":  recent_audit,
        "active_ws_sessions": ws_manager.active_connection_count(),
    }
