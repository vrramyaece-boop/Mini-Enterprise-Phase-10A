# routers/role_dashboard.py — Phase 5: Role-based dashboard endpoints
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import models
from app.services import role_dashboard_service

router = APIRouter(prefix="/role-dashboard", tags=["Role Dashboard"])


@router.get("/employee")
def employee_dashboard(db: Session = Depends(get_db),
                       current_user: models.User = Depends(get_current_user)):
    """Employee: assigned tasks, requests, notifications, completion rate."""
    if current_user.role not in ("employee", "admin"):
        raise HTTPException(status_code=403, detail="Employee or Admin access only")
    return role_dashboard_service.get_employee_dashboard(db, current_user)


@router.get("/manager")
def manager_dashboard(db: Session = Depends(get_db),
                      current_user: models.User = Depends(get_current_user)):
    """Manager: team tasks, approvals, overdue, completion, activity."""
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Manager or Admin access only")
    return role_dashboard_service.get_manager_dashboard(db, current_user)


@router.get("/admin")
def admin_dashboard(db: Session = Depends(get_db),
                    current_user: models.User = Depends(get_current_user)):
    """Admin: full system analytics, health, WS sessions, audit logs."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return role_dashboard_service.get_admin_dashboard(db, current_user)
