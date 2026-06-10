# routers/activity.py — Phase 5: Activity tracking endpoints
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import schemas, models
from app.services import activity_service
from app.services.pagination_service import paginate

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/", response_model=schemas.PaginatedActivityLogs)
def get_activity_logs(
    page:        int = Query(default=1,  ge=1),
    page_size:   int = Query(default=20, ge=1, le=100),
    entity_type: str | None = Query(default=None),
    db:          Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Admin only — full paginated activity log."""
    return activity_service.get_activity_logs_paginated(
        db, current_user, page, page_size, entity_type
    )


@router.get("/{entity_type}/{entity_id}", response_model=list[schemas.ActivityLogOut])
def get_entity_history(
    entity_type:  str,
    entity_id:    int,
    db:           Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Full change history for a specific entity (e.g. task #5)."""
    return activity_service.get_entity_history(db, entity_type, entity_id)
