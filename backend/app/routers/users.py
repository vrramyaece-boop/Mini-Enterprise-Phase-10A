# routers/users.py — THIN ROUTER
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app import schemas, models
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db),
               _: models.User = Depends(require_admin)):
    return user_service.get_all_users(db)

@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db),
             current_user: models.User = Depends(get_current_user)):
    return user_service.get_user_by_id(db, user_id, current_user)
