# services/task_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException
from app.repository import audit_repository, notification_repository
from app import models, schemas

logger = logging.getLogger(__name__)
VALID_TRANSITIONS = {
    "todo":        ["in_progress"],
    "in_progress": ["review"],
    "review":      ["done", "in_progress"],
    "done":        [],
}


def _tasks_stmt(current_user: models.User):
    stmt = select(models.Task).options(selectinload(models.Task.assignee))
    if current_user.role == "admin":     return stmt
    elif current_user.role == "manager": return stmt.where(models.Task.created_by_id == current_user.id)
    else:                                return stmt.where(models.Task.assigned_to_id == current_user.id)


def get_tasks_for_user(db: Session, current_user: models.User):
    return db.execute(_tasks_stmt(current_user)).scalars().all()


def get_kanban_board(db: Session, current_user: models.User) -> dict:
    tasks = db.execute(_tasks_stmt(current_user)).scalars().all()
    board = {"todo": [], "in_progress": [], "review": [], "done": []}
    for task in tasks:
        col = task.status if task.status in board else "todo"
        board[col].append({
            "id": task.id, "title": task.title, "description": task.description,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "assigned_to_id": task.assigned_to_id,
            "assignee_name":  task.assignee.name if task.assignee else None,
            "created_by_id":  task.created_by_id,
            "updated_by_id":  task.updated_by_id,
            "created_at":     task.created_at.isoformat(),
            "updated_at":     task.updated_at.isoformat(),
        })
    return board


def get_task_or_404(db: Session, task_id: int, current_user: models.User):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task


def create_task(db: Session, data: schemas.TaskCreate, current_user: models.User):
    if data.assigned_to_id:
        if not db.execute(select(models.User).where(models.User.id == data.assigned_to_id)).scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Assigned user not found")
    task = models.Task(title=data.title, description=data.description,
        status=data.status or "todo", priority=data.priority or "medium",
        due_date=data.due_date, created_by_id=current_user.id,
        assigned_to_id=data.assigned_to_id, updated_by_id=current_user.id)
    db.add(task); db.commit(); db.refresh(task)
    audit_repository.create(db, user_id=current_user.id, action="created_task",
        entity="task", entity_id=task.id, detail=task.title)
    if task.assigned_to_id and task.assigned_to_id != current_user.id:
        notification_repository.create(db, user_id=task.assigned_to_id,
            message=f'📋 You have been assigned task: "{task.title}" by {current_user.name}')
    logger.info(f"Task {task.id} created by {current_user.email}")
    return task


def update_task(db: Session, task_id: int, data: schemas.TaskUpdate, current_user: models.User):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "employee":
        if task.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if data.status: task.status = data.status
        task.updated_by_id = current_user.id; db.commit(); db.refresh(task)
        audit_repository.create(db, user_id=current_user.id, action="updated_task",
            entity="task", entity_id=task.id, detail=f"status → {data.status}")
        return task
    if current_user.role == "manager" and task.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own tasks")
    if data.title:       task.title       = data.title
    if data.description: task.description = data.description
    if data.status:      task.status      = data.status
    if data.priority:    task.priority    = data.priority
    if data.due_date:    task.due_date    = data.due_date
    task.updated_by_id = current_user.id; db.commit(); db.refresh(task)
    audit_repository.create(db, user_id=current_user.id, action="updated_task",
        entity="task", entity_id=task.id, detail=task.title)
    return task


def delete_task(db: Session, task_id: int, current_user: models.User) -> dict:
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "manager" and task.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own tasks")
    title = task.title; db.delete(task); db.commit()
    audit_repository.create(db, user_id=current_user.id, action="deleted_task",
        entity="task", entity_id=task_id, detail=title)
    return {"message": f"Task {task_id} deleted successfully"}


def assign_task(db: Session, task_id: int, assigned_to_id: int, current_user: models.User):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if not db.execute(select(models.User).where(models.User.id == assigned_to_id)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User to assign not found")
    task.assigned_to_id = assigned_to_id; task.updated_by_id = current_user.id
    db.commit(); db.refresh(task)
    audit_repository.create(db, user_id=current_user.id, action="assigned_task",
        entity="task", entity_id=task_id, detail=f"assigned to user {assigned_to_id}")
    if assigned_to_id != current_user.id:
        notification_repository.create(db, user_id=assigned_to_id,
            message=f'📋 You have been assigned task: "{task.title}" by {current_user.name}')
    return task


def move_task_status(db: Session, task_id: int, new_status: str, current_user: models.User):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    old_status = task.status
    allowed    = VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed:
        raise HTTPException(status_code=400,
            detail=f"Invalid transition: '{old_status}' → '{new_status}'. Allowed: {allowed}")
    task.status = new_status; task.updated_by_id = current_user.id
    db.add(models.StatusHistory(task_id=task_id, changed_by=current_user.id,
                                 from_status=old_status, to_status=new_status))
    db.commit(); db.refresh(task)
    audit_repository.create(db, user_id=current_user.id, action="updated_status",
        entity="task", entity_id=task_id, detail=f"{old_status} → {new_status}")
    return task


def get_status_history(db: Session, task_id: int, current_user: models.User):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return db.execute(select(models.StatusHistory)
        .where(models.StatusHistory.task_id == task_id)
        .order_by(models.StatusHistory.changed_at)).scalars().all()


def add_comment(db: Session, task_id: int, content: str, is_internal: bool, current_user: models.User):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "employee": is_internal = False
    comment = models.Comment(task_id=task_id, user_id=current_user.id,
                              content=content, is_internal=is_internal)
    db.add(comment); db.commit(); db.refresh(comment)
    audit_repository.create(db, user_id=current_user.id, action="added_comment",
        entity="task", entity_id=task_id, detail=content[:80])
    targets = set()
    if task.assigned_to_id and task.assigned_to_id != current_user.id: targets.add(task.assigned_to_id)
    if task.created_by_id  and task.created_by_id  != current_user.id: targets.add(task.created_by_id)
    if targets:
        notification_repository.create_bulk(db, list(targets),
            message=f'💬 {current_user.name} commented on task: "{task.title}"')
    return comment


def get_comments(db: Session, task_id: int, current_user: models.User):
    task = db.execute(select(models.Task).where(models.Task.id == task_id)).scalar_one_or_none()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    stmt = select(models.Comment).where(models.Comment.task_id == task_id)
    if current_user.role == "employee":
        stmt = stmt.where(models.Comment.is_internal == False)
    return db.execute(stmt.order_by(models.Comment.created_at)).scalars().all()
