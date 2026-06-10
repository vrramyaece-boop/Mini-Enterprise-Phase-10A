# services/dashboard_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from app import models, schemas

logger = logging.getLogger(__name__)


def _tasks_for_user(db: Session, current_user: models.User):
    stmt = select(models.Task).options(selectinload(models.Task.assignee))
    if current_user.role == "admin":     pass
    elif current_user.role == "manager": stmt = stmt.where(models.Task.created_by_id == current_user.id)
    else:                                stmt = stmt.where(models.Task.assigned_to_id == current_user.id)
    return db.execute(stmt).scalars().all()


def _pending_approvals(db: Session, current_user: models.User) -> int:
    stmt = select(func.count()).select_from(models.Approval)
    if current_user.role == "admin":
        stmt = stmt.where(models.Approval.status == "pending")
    elif current_user.role == "manager":
        stmt = stmt.where(models.Approval.status == "pending",
                          models.Approval.current_level == "manager")
    else:
        stmt = stmt.where(models.Approval.requested_by_id == current_user.id,
                          models.Approval.status == "pending")
    return db.execute(stmt).scalar_one()


def get_summary(db: Session, current_user: models.User):
    tasks = _tasks_for_user(db, current_user)
    total = len(tasks)
    return schemas.DashboardSummary(
        total_tasks=total,
        todo=sum(1 for t in tasks if t.status == "todo"),
        in_progress=sum(1 for t in tasks if t.status == "in_progress"),
        review=sum(1 for t in tasks if t.status == "review"),
        done=sum(1 for t in tasks if t.status == "done"),
        pending_approvals=_pending_approvals(db, current_user),
        completed_tasks=sum(1 for t in tasks if t.status == "done"),
    )


def get_task_distribution(db: Session, current_user: models.User):
    tasks  = _tasks_for_user(db, current_user)
    counts = {"todo": 0, "in_progress": 0, "review": 0, "done": 0}
    for t in tasks:
        if t.status in counts: counts[t.status] += 1
    return [schemas.TaskDistribution(status=s, count=c) for s, c in counts.items()]


def get_performance_insights(db: Session, current_user: models.User):
    tasks = _tasks_for_user(db, current_user)
    total = len(tasks)
    if total == 0:
        return schemas.PerformanceInsights(completion_rate=0.0, in_review_rate=0.0,
                                            overdue_tasks=0, avg_comments_per_task=0.0)
    now          = datetime.utcnow()
    done_count   = sum(1 for t in tasks if t.status == "done")
    review_count = sum(1 for t in tasks if t.status == "review")
    overdue      = sum(1 for t in tasks if t.due_date and t.due_date < now and t.status != "done")
    task_ids     = [t.id for t in tasks]
    total_comments = db.execute(
        select(func.count()).select_from(models.Comment)
        .where(models.Comment.task_id.in_(task_ids))
    ).scalar_one() if task_ids else 0
    return schemas.PerformanceInsights(
        completion_rate=round((done_count / total) * 100, 1),
        in_review_rate=round((review_count / total) * 100, 1),
        overdue_tasks=overdue,
        avg_comments_per_task=round(total_comments / total, 1),
    )


def get_team_progress(db: Session, current_user: models.User) -> dict:
    stmt = select(models.Task).options(selectinload(models.Task.assignee))
    if current_user.role != "admin":
        stmt = stmt.where(models.Task.created_by_id == current_user.id)
    tasks    = db.execute(stmt).scalars().all()
    now      = datetime.utcnow()
    progress = {}
    for task in tasks:
        uid = task.assigned_to_id or 0
        if uid not in progress:
            if uid and task.assignee: uname, urole = task.assignee.name, task.assignee.role
            elif uid:                 uname, urole = f"User #{uid}", "unknown"
            else:                     uname, urole = "Unassigned", ""
            progress[uid] = {"user_id": uid, "user_name": uname, "user_role": urole,
                             "todo": 0, "in_progress": 0, "review": 0, "done": 0, "total": 0}
        progress[uid][task.status] = progress[uid].get(task.status, 0) + 1
        progress[uid]["total"] += 1
    return {"team_members": list(progress.values()), "total_tasks": len(tasks),
            "done_tasks": sum(1 for t in tasks if t.status == "done"),
            "overdue_tasks": sum(1 for t in tasks
                                 if t.due_date and t.due_date < now and t.status != "done")}
