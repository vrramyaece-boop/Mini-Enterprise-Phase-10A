from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import notification_preference_service

router = APIRouter(prefix="/notification-preferences", tags=["Phase 8 — Notification Preferences"])

@router.get("/me",  response_model=schemas.NotificationPreferenceOut)
def get_my_preferences(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return notification_preference_service.get_my_preferences(db, current_user)

@router.put("/me",  response_model=schemas.NotificationPreferenceOut)
def update_my_preferences(body: schemas.NotificationPreferenceUpdate, db: Session=Depends(get_db),
                           current_user: models.User=Depends(get_current_user)):
    return notification_preference_service.update_my_preferences(db, body, current_user)

@router.post("/default/{user_id}", response_model=schemas.NotificationPreferenceOut, status_code=201)
def create_defaults(user_id: int, db: Session=Depends(get_db),
                    current_user: models.User=Depends(get_current_user)):
    return notification_preference_service.create_default_preferences(db, user_id, current_user)
