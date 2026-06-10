# routers/auth.py — THIN ROUTER Phase 1 + Phase 4
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import schemas, models
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(body: schemas.UserCreate, db: Session = Depends(get_db)):
    return auth_service.register_user(db, name=body.name, email=body.email,
                                      password=body.password, role=body.role)


@router.post("/login", response_model=schemas.TokenPair)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(db, email=body.email, password=body.password)


@router.post("/token", response_model=schemas.TokenPair)
def login_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Swagger UI compatible login endpoint.
    Accepts OAuth2 form data (username = your email, password = your password).
    This makes the Authorize button in Swagger docs work correctly.
    """
    return auth_service.login_user(db, email=form_data.username, password=form_data.password)


@router.post("/refresh", response_model=schemas.TokenPair)
def refresh(body: schemas.RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_access_token(db, body.refresh_token)


@router.post("/logout")
def logout(body: schemas.RefreshRequest, db: Session = Depends(get_db),
           current_user: models.User = Depends(get_current_user)):
    return auth_service.logout_user(db, body.refresh_token, current_user)


@router.post("/forgot-password")
def forgot_password(body: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    return auth_service.request_password_reset(db, body.email)


@router.post("/reset-password")
def reset_password(body: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    return auth_service.confirm_password_reset(db, body.token, body.new_password)


@router.post("/change-password")
def change_password(body: schemas.ChangePasswordRequest, db: Session = Depends(get_db),
                    current_user: models.User = Depends(get_current_user)):
    return auth_service.change_password(db, body.current_password,
                                        body.new_password, current_user)


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
