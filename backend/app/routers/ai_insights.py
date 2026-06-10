# routers/ai_insights.py — Phase 6: AI-based task insights + smart assignment
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import schemas, models
from app.services import ai_insights_service

router = APIRouter(prefix="/ai", tags=["AI Insights"])


@router.get("/task-insights", response_model=list[schemas.AITaskInsight])
def task_insights(db: Session = Depends(get_db),
                  current_user: models.User = Depends(get_current_user)):
    """
    Phase 6: AI-powered task risk analysis.
    Identifies high-priority pending tasks and delay risks.
    """
    return ai_insights_service.get_task_insights(db, current_user)


@router.get("/smart-assign/{task_id}", response_model=list[schemas.SmartAssignSuggestion])
def smart_assign(task_id: int,
                 db: Session = Depends(get_db),
                 current_user: models.User = Depends(get_current_user)):
    """
    Phase 6: Smart task assignment suggestions.
    Ranks employees by workload and historical performance.
    """
    return ai_insights_service.get_smart_assignment_suggestions(db, task_id, current_user)
