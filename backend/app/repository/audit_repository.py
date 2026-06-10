# repository/audit_repository.py — SQLAlchemy 2.0: select() + execute()
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app import models

logger = logging.getLogger(__name__)


def create(db: Session, user_id: int, action: str,
           entity: str, entity_id: int | None = None,
           detail: str | None = None) -> models.AuditLog:
    row = models.AuditLog(user_id=user_id, action=action,
                           entity=entity, entity_id=entity_id, detail=detail)
    db.add(row); db.commit(); db.refresh(row)
    return row


def get_all(db: Session, limit: int = 100) -> list[models.AuditLog]:
    return db.execute(
        select(models.AuditLog)
        .options(selectinload(models.AuditLog.actor))
        .order_by(models.AuditLog.timestamp.desc())
        .limit(limit)
    ).scalars().all()


def get_by_user(db: Session, user_id: int, limit: int = 50) -> list[models.AuditLog]:
    return db.execute(
        select(models.AuditLog)
        .options(selectinload(models.AuditLog.actor))
        .where(models.AuditLog.user_id == user_id)
        .order_by(models.AuditLog.timestamp.desc())
        .limit(limit)
    ).scalars().all()


def get_by_entity(db: Session, entity: str, entity_id: int) -> list[models.AuditLog]:
    return db.execute(
        select(models.AuditLog)
        .options(selectinload(models.AuditLog.actor))
        .where(models.AuditLog.entity == entity,
               models.AuditLog.entity_id == entity_id)
        .order_by(models.AuditLog.timestamp.desc())
    ).scalars().all()


def get_recent(db: Session, limit: int = 20) -> list[models.AuditLog]:
    return db.execute(
        select(models.AuditLog)
        .options(selectinload(models.AuditLog.actor))
        .order_by(models.AuditLog.timestamp.desc())
        .limit(limit)
    ).scalars().all()
