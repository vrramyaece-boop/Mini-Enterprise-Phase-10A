# repository/notification_repository.py — SQLAlchemy 2.0: select() + execute()
import logging
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app import models

logger = logging.getLogger(__name__)


def create(db: Session, user_id: int, message: str) -> models.Notification:
    notif = models.Notification(user_id=user_id, message=message)
    db.add(notif); db.commit(); db.refresh(notif)
    return notif


def create_bulk(db: Session, user_ids: list[int], message: str) -> list[models.Notification]:
    rows = [models.Notification(user_id=uid, message=message) for uid in user_ids]
    db.add_all(rows); db.commit()
    return rows


def get_for_user(db: Session, user_id: int, unread_only: bool = False) -> list[models.Notification]:
    stmt = (select(models.Notification)
            .where(models.Notification.user_id == user_id)
            .order_by(models.Notification.created_at.desc()))
    if unread_only:
        stmt = stmt.where(models.Notification.is_read == False)
    return db.execute(stmt).scalars().all()


def mark_read(db: Session, notif_id: int, user_id: int) -> models.Notification | None:
    notif = db.execute(
        select(models.Notification).where(
            models.Notification.id      == notif_id,
            models.Notification.user_id == user_id,
        )
    ).scalar_one_or_none()
    if notif:
        notif.is_read = True; db.commit(); db.refresh(notif)
    return notif


def mark_all_read(db: Session, user_id: int) -> int:
    notifs = db.execute(
        select(models.Notification).where(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False,
        )
    ).scalars().all()
    for n in notifs:
        n.is_read = True
    db.commit()
    return len(notifs)


def count_unread(db: Session, user_id: int) -> int:
    return db.execute(
        select(func.count()).select_from(models.Notification).where(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False,
        )
    ).scalar_one()
