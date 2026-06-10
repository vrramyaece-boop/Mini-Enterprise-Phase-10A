# dependencies.py — SQLAlchemy 2.0: select() + execute()
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import decode_access_token
from app import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> models.User:
    email = decode_access_token(token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired token")
    user = db.execute(
        select(models.User).where(models.User.email == email)
    ).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found or inactive")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_manager_or_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Manager or Admin access required")
    return current_user


# ── Phase 10A: Super Admin dependency ─────────────────────────────────────────
# Super Admin is a platform-level role that can manage ALL tenants.
# How to check: user.is_super_admin == True  (role can still be "admin")
# Usage: Depends(require_super_admin) in any tenant-management endpoint.

def require_super_admin(current_user: models.User = Depends(get_current_user)):
    """
    Only allows users who have is_super_admin=True.
    Super Admins can see and manage ALL tenants across the platform.
    Regular admins are tenant-scoped and cannot use these endpoints.
    """
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Super Admin access required. "
                   "This endpoint is only for platform-level administrators."
        )
    return current_user
