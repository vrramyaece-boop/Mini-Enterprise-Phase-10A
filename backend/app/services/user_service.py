# services/user_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models

logger = logging.getLogger(__name__)


def get_all_users(db: Session):
    return db.execute(select(models.User)).scalars().all()


def get_user_by_id(db: Session, user_id: int, current_user: models.User):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.execute(select(models.User).where(models.User.id == user_id)).scalar_one_or_none()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    return user
