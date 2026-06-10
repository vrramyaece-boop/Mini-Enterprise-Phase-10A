# services/auth_service.py — SQLAlchemy 2.0: select() + execute()
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.auth import (hash_password, verify_password, create_access_token,
                      create_refresh_token_value, refresh_token_expiry,
                      create_password_reset_token, password_reset_expiry)
from app.middleware.input_sanitizer import sanitize_string, validate_password_strength
from app import models

logger    = logging.getLogger(__name__)
# Note: 'super_admin' is NOT in VALID_ROLES — super admins are created only through
# the dedicated /super-admin/create endpoint, not through regular registration.
VALID_ROLES = ("admin", "manager", "employee")


def register_user(db: Session, name: str, email: str, password: str, role: str):
    name = sanitize_string(name, 100)
    is_valid, msg = validate_password_strength(password)
    if not is_valid: raise HTTPException(status_code=400, detail=msg)
    if db.execute(select(models.User).where(models.User.email == email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_ROLES)}")
    user = models.User(name=name, email=email, hashed_password=hash_password(password), role=role)
    db.add(user); db.commit(); db.refresh(user)
    logger.info(f"Registered: {email} ({role})")
    return user


def login_user(db: Session, email: str, password: str) -> dict:
    user = db.execute(select(models.User).where(models.User.email == email)).scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    access  = create_access_token(data={"sub": user.email})
    refresh = create_refresh_token_value()
    db.add(models.RefreshToken(user_id=user.id, token=refresh, expires_at=refresh_token_expiry()))
    db.commit()
    logger.info(f"Login: {email}")
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


def refresh_access_token(db: Session, refresh_token: str) -> dict:
    token_row = db.execute(
        select(models.RefreshToken).where(
            models.RefreshToken.token   == refresh_token,
            models.RefreshToken.revoked == False
        )
    ).scalar_one_or_none()
    if not token_row: raise HTTPException(status_code=401, detail="Invalid refresh token")
    if token_row.expires_at < datetime.utcnow():
        token_row.revoked = True; db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")
    user = db.execute(select(models.User).where(models.User.id == token_row.user_id)).scalar_one_or_none()
    if not user or not user.is_active: raise HTTPException(status_code=401, detail="User not found")
    token_row.revoked = True
    new_access  = create_access_token(data={"sub": user.email})
    new_refresh = create_refresh_token_value()
    db.add(models.RefreshToken(user_id=user.id, token=new_refresh, expires_at=refresh_token_expiry()))
    db.commit()
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


def logout_user(db: Session, refresh_token: str, current_user: models.User) -> dict:
    row = db.execute(select(models.RefreshToken).where(
        models.RefreshToken.token == refresh_token)).scalar_one_or_none()
    if row: row.revoked = True; db.commit()
    return {"message": "Logged out successfully"}


def request_password_reset(db: Session, email: str) -> dict:
    user = db.execute(select(models.User).where(models.User.email == email)).scalar_one_or_none()
    if not user: return {"message": "If that email exists, a reset link has been sent"}
    for old in db.execute(select(models.PasswordResetToken).where(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.used    == False)).scalars().all():
        old.used = True
    token = create_password_reset_token()
    db.add(models.PasswordResetToken(user_id=user.id, token=token, expires_at=password_reset_expiry()))
    db.commit()
    return {"message": "Password reset token generated", "reset_token": token, "expires_in": "1 hour"}


def confirm_password_reset(db: Session, token: str, new_password: str) -> dict:
    is_valid, msg = validate_password_strength(new_password)
    if not is_valid: raise HTTPException(status_code=400, detail=msg)
    token_row = db.execute(select(models.PasswordResetToken).where(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used  == False)).scalar_one_or_none()
    if not token_row: raise HTTPException(status_code=400, detail="Invalid or used reset token")
    if token_row.expires_at < datetime.utcnow(): raise HTTPException(status_code=400, detail="Token expired")
    user = db.execute(select(models.User).where(models.User.id == token_row.user_id)).scalar_one_or_none()
    user.hashed_password = hash_password(new_password); token_row.used = True
    for rt in db.execute(select(models.RefreshToken).where(
            models.RefreshToken.user_id == user.id,
            models.RefreshToken.revoked == False)).scalars().all():
        rt.revoked = True
    db.commit()
    return {"message": "Password reset successfully. Please log in again."}


def change_password(db: Session, current_password: str, new_password: str,
                    current_user: models.User) -> dict:
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    is_valid, msg = validate_password_strength(new_password)
    if not is_valid: raise HTTPException(status_code=400, detail=msg)
    current_user.hashed_password = hash_password(new_password)
    for rt in db.execute(select(models.RefreshToken).where(
            models.RefreshToken.user_id == current_user.id,
            models.RefreshToken.revoked == False)).scalars().all():
        rt.revoked = True
    db.commit()
    return {"message": "Password changed successfully. Please log in again."}
