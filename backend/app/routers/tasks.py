# routers/tasks.py — THIN ROUTER (Phase 2 + Phase 3)
# Zero DB code. Zero business logic.

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_manager_or_admin
from app import models, schemas
from app.services import task_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/", response_model=schemas.TaskOut, status_code=201)
def create_task(body: schemas.TaskCreate, db: Session = Depends(get_db),
                current_user: models.User = Depends(require_manager_or_admin)):
    return task_service.create_task(db, body, current_user)


@router.get("/kanban")
def get_kanban(db: Session = Depends(get_db),
               current_user: models.User = Depends(get_current_user)):
    return task_service.get_kanban_board(db, current_user)


@router.get("/", response_model=list[schemas.TaskOut])
def list_tasks(db: Session = Depends(get_db),
               current_user: models.User = Depends(get_current_user)):
    return task_service.get_tasks_for_user(db, current_user)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db),
             current_user: models.User = Depends(get_current_user)):
    return task_service.get_task_or_404(db, task_id, current_user)


@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, body: schemas.TaskUpdate,
                db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    return task_service.update_task(db, task_id, body, current_user)


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db),
                current_user: models.User = Depends(require_manager_or_admin)):
    return task_service.delete_task(db, task_id, current_user)


@router.patch("/{task_id}/assign", response_model=schemas.TaskOut)
def assign_task(task_id: int, body: schemas.TaskAssign,
                db: Session = Depends(get_db),
                current_user: models.User = Depends(require_manager_or_admin)):
    return task_service.assign_task(db, task_id, body.assigned_to_id, current_user)


@router.patch("/{task_id}/status", response_model=schemas.TaskOut)
def update_status(task_id: int, body: schemas.TaskStatusUpdate,
                  db: Session = Depends(get_db),
                  current_user: models.User = Depends(get_current_user)):
    return task_service.move_task_status(db, task_id, body.status, current_user)


@router.get("/{task_id}/status-history", response_model=list[schemas.StatusHistoryOut])
def get_status_history(task_id: int, db: Session = Depends(get_db),
                       current_user: models.User = Depends(get_current_user)):
    return task_service.get_status_history(db, task_id, current_user)


@router.post("/{task_id}/comments", response_model=schemas.CommentOut, status_code=201)
def add_comment(task_id: int, body: schemas.CommentCreate,
                db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    return task_service.add_comment(db, task_id, body.content,
                                    body.is_internal, current_user)


@router.get("/{task_id}/comments", response_model=list[schemas.CommentOut])
def get_comments(task_id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(get_current_user)):
    return task_service.get_comments(db, task_id, current_user)
