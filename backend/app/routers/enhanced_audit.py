from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.services import enhanced_audit_service

router = APIRouter(prefix="/audit-logs", tags=["Phase 8 — Enhanced Audit"])

@router.get("/enhanced",              response_model=Page[schemas.AuditLogOutEnhanced])
def list_all(db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return enhanced_audit_service.get_all_paginated(db, current_user)

@router.get("/{log_id}",              response_model=schemas.AuditLogOutEnhanced)
def get_by_id(log_id: int, db: Session=Depends(get_db),
              current_user: models.User=Depends(get_current_user)):
    return enhanced_audit_service.get_by_id(db, log_id, current_user)

@router.get("/module/{module_name}",  response_model=Page[schemas.AuditLogOutEnhanced])
def get_by_module(module_name: str, db: Session=Depends(get_db),
                  current_user: models.User=Depends(get_current_user)):
    return enhanced_audit_service.get_by_module(db, module_name, current_user)

@router.get("/user/{user_id}",        response_model=Page[schemas.AuditLogOutEnhanced])
def get_by_user(user_id: int, db: Session=Depends(get_db),
                current_user: models.User=Depends(get_current_user)):
    return enhanced_audit_service.get_by_user(db, user_id, current_user)

@router.get("/date-range",            response_model=Page[schemas.AuditLogOutEnhanced])
def get_by_date_range(start_date: datetime=Query(...), end_date: datetime=Query(...),
                       db: Session=Depends(get_db), current_user: models.User=Depends(get_current_user)):
    return enhanced_audit_service.get_by_date_range(db, start_date, end_date, current_user)
