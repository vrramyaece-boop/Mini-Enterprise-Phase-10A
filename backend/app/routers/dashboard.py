# routers/dashboard.py — THIN ROUTER (Phase 2 + Phase 3)
# Phase 3 adds: GET /dashboard/ai-summary

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import dashboard_service, ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db),
            current_user: models.User = Depends(get_current_user)):
    return dashboard_service.get_summary(db, current_user)


@router.get("/task-distribution", response_model=list[schemas.TaskDistribution])
def task_distribution(db: Session = Depends(get_db),
                      current_user: models.User = Depends(get_current_user)):
    return dashboard_service.get_task_distribution(db, current_user)


@router.get("/performance-insights", response_model=schemas.PerformanceInsights)
def performance_insights(db: Session = Depends(get_db),
                         current_user: models.User = Depends(get_current_user)):
    return dashboard_service.get_performance_insights(db, current_user)


@router.get("/team-progress")
def team_progress(db: Session = Depends(get_db),
                  current_user: models.User = Depends(get_current_user)):
    if current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Access denied")
    return dashboard_service.get_team_progress(db, current_user)


# Phase 3 — AI Summary (spec §5.4 + §5.5)
@router.get("/ai-summary", response_model=schemas.AISummary)
def ai_summary(db: Session = Depends(get_db),
               current_user: models.User = Depends(get_current_user)):
    """
    AI-powered insights from live data.
    Returns: pending tasks, high priority count, delayed tasks,
    summary text, insights list, and activity feed.
    """
    return ai_service.get_ai_summary(db, current_user)
