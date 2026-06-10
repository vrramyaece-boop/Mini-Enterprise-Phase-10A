# services/ai_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.repository import audit_repository
from app import models

logger = logging.getLogger(__name__)


def _get_user_tasks(db: Session, current_user: models.User) -> list:
    stmt = select(models.Task)
    if current_user.role == "manager":   stmt = stmt.where(models.Task.created_by_id == current_user.id)
    elif current_user.role == "employee": stmt = stmt.where(models.Task.assigned_to_id == current_user.id)
    return db.execute(stmt).scalars().all()


def get_ai_summary(db: Session, current_user: models.User) -> dict:
    tasks        = _get_user_tasks(db, current_user)
    now          = datetime.utcnow()
    total        = len(tasks)
    pending      = [t for t in tasks if t.status != "done"]
    high_priority = [t for t in tasks if t.priority == "high" and t.status != "done"]
    delayed       = [t for t in tasks if t.due_date and t.due_date < now and t.status != "done"]
    in_review     = [t for t in tasks if t.status == "review"]
    completed     = [t for t in tasks if t.status == "done"]
    todo_tasks    = [t for t in tasks if t.status == "todo"]
    insights: list[str] = []
    if not tasks:
        insights.append("No tasks found. Create your first task to get started!")
    else:
        if high_priority:
            names  = ", ".join(f'"{t.title}"' for t in high_priority[:3])
            suffix = f" including {names}" if len(high_priority) <= 3 else ""
            insights.append(f"🔴 {len(high_priority)} high priority task(s) still pending{suffix}")
        if delayed:
            insights.append(f"⏰ {len(delayed)} task(s) overdue — immediate attention needed")
        if pending:
            insights.append(f"📋 {len(pending)} task(s) pending ({len(todo_tasks)} not started, {len(in_review)} in review)")
        if completed:
            rate = round((len(completed) / total) * 100)
            insights.append(f"✅ {len(completed)} task(s) completed ({rate}% completion rate)")
        if not high_priority and not delayed and pending:
            insights.append("👍 No high priority or overdue tasks — good progress!")
    if current_user.role in ("admin", "manager"):
        pending_approvals = db.execute(
            select(func.count()).select_from(models.Approval)
            .where(models.Approval.status == "pending")
        ).scalar_one()
        if pending_approvals:
            insights.append(f"📨 {pending_approvals} approval request(s) awaiting your review")
    if not tasks:       summary_text = "No tasks yet. Start by creating your first task."
    elif not pending:   summary_text = f"🎉 All {total} tasks are complete!"
    else:
        parts = []
        if high_priority: parts.append(f"{len(high_priority)} high priority pending")
        if delayed:       parts.append(f"{len(delayed)} overdue")
        parts.append(f"{len(completed)}/{total} done")
        summary_text = " · ".join(parts)
    recent_logs   = audit_repository.get_recent(db, limit=10)
    activity_feed = []
    for log in recent_logs:
        actor_name = log.actor.name if log.actor else f"User #{log.user_id}"
        detail_str = f": {log.detail}" if log.detail else ""
        ts         = log.timestamp.strftime("%b %d, %H:%M")
        activity_feed.append(f"[{ts}] {actor_name} {log.action.replace('_',' ')} "
                              f"{log.entity} #{log.entity_id}{detail_str}")
    return {"total_pending": len(pending), "high_priority_count": len(high_priority),
            "delayed_count": len(delayed), "summary_text": summary_text,
            "insights": insights, "activity_feed": activity_feed}
