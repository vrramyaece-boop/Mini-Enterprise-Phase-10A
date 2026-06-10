# services/ai_insights_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app import models

logger = logging.getLogger(__name__)


def get_task_insights(db: Session, current_user: models.User) -> list[dict]:
    stmt = select(models.Task).where(models.Task.status != "done")
    if current_user.role == "manager":   stmt = stmt.where(models.Task.created_by_id == current_user.id)
    elif current_user.role == "employee": stmt = stmt.where(models.Task.assigned_to_id == current_user.id)
    tasks   = db.execute(stmt).scalars().all()
    now     = datetime.utcnow()
    results = []
    for task in tasks:
        risk_level = "low"; risk_reason = ""; suggestion = ""
        if task.priority == "high" and task.status == "todo":
            risk_level = "high"; risk_reason = "High priority task hasn't been started yet"
            suggestion = "Start this task immediately — it has high priority"
        elif task.due_date and task.due_date < now:
            days_overdue = (now - task.due_date).days
            risk_level = "high"; risk_reason = f"Task is {days_overdue} day(s) overdue"
            suggestion = "Escalate or reassign — this task is past its deadline"
        elif task.due_date and task.due_date < now + timedelta(days=2):
            risk_level = "medium"; risk_reason = "Task is due within 48 hours"
            suggestion = "Prioritise this task to meet the deadline"
        elif task.status == "in_progress":
            days_in = (now - task.updated_at).days if task.updated_at else 0
            if days_in > 7:
                risk_level = "medium"
                risk_reason = f"Task in progress for {days_in} days without update"
                suggestion = "Check progress — this task may be blocked"
        elif task.priority == "low" and task.status == "todo" and not task.due_date:
            risk_level = "low"; risk_reason = "Low priority task with no deadline"
            suggestion = "Schedule when capacity allows"
        results.append({"task_id": task.id, "task_title": task.title,
                        "risk_level": risk_level, "risk_reason": risk_reason, "suggestion": suggestion})
    order = {"high": 0, "medium": 1, "low": 2}
    results.sort(key=lambda x: order.get(x["risk_level"], 3))
    return results


def get_smart_assignment_suggestions(db: Session, task_id: int,
                                      current_user: models.User) -> list[dict]:
    employees = db.execute(
        select(models.User).where(models.User.role == "employee", models.User.is_active == True)
    ).scalars().all()
    suggestions = []
    for emp in employees:
        active_tasks = db.execute(
            select(func.count()).select_from(models.Task)
            .where(models.Task.assigned_to_id == emp.id, models.Task.status != "done")
        ).scalar_one()
        completed_tasks = db.execute(
            select(func.count()).select_from(models.Task)
            .where(models.Task.assigned_to_id == emp.id, models.Task.status == "done")
        ).scalar_one()
        score = round(completed_tasks / (active_tasks + 1), 2)
        if active_tasks == 0:       reason = "No active tasks — fully available"
        elif active_tasks <= 2:     reason = f"Light workload ({active_tasks} active tasks)"
        elif active_tasks <= 5:     reason = f"Moderate workload ({active_tasks} active tasks)"
        else:                       reason = f"Heavy workload ({active_tasks} active tasks) — consider others"
        suggestions.append({"user_id": emp.id, "user_name": emp.name,
                            "active_tasks": active_tasks, "score": score, "reason": reason})
    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return suggestions
