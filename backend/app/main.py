# main.py — Phase 1 + 2 + 3 + 4 + 5 + 6 + 7
# Architecture: Router (HTTP) → Service (logic) → DB

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Index

from app.database import engine, Base
from fastapi_pagination import add_pagination
from app import models  # registers ALL tables

# Phase 1-3 routers
from app.routers.auth        import router as auth_router
from app.routers.users       import router as users_router
from app.routers.tasks       import router as tasks_router
from app.routers.approvals   import router as approvals_router
from app.routers.dashboard   import router as dashboard_router
from app.routers.documents   import router as documents_router
from app.routers.audit       import router as audit_router
from app.routers.notifications import router as notifications_router

# Phase 4-7 routers
from app.routers.websocket_router import router as ws_router
from app.routers.activity         import router as activity_router
from app.routers.role_dashboard   import router as role_dashboard_router
from app.routers.ai_insights      import router as ai_router
from app.routers.saas             import router as saas_router
from app.routers.sla                      import router as sla_router
from app.routers.escalation               import router as escalation_router
from app.routers.notification_preferences import router as notif_pref_router
from app.routers.enhanced_audit           import router as enhanced_audit_router

# Phase 10A routers
from app.routers.tenants     import router as tenants_router
from app.routers.super_admin import router as super_admin_router  # NEW: Platform-level Super Admin

# Phase 4 middleware
from app.middleware.rate_limiter      import RateLimiterMiddleware
from app.middleware.logging_middleware import LoggingMiddleware

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("main")

# ── DB tables + Phase 4 indexes ───────────────────────────────
Base.metadata.create_all(bind=engine)

def _safe_migrate():
    import sqlalchemy as _sa
    with engine.connect() as conn:
        for tbl,col,typ in [
            ('tasks','sla_status','VARCHAR(20)'),('tasks','sla_due_time','DATETIME'),
            ('tasks','is_sla_breached','BOOLEAN DEFAULT 0'),
            ('approvals','sla_status','VARCHAR(20)'),('approvals','sla_due_time','DATETIME'),
            ('approvals','is_escalated','BOOLEAN DEFAULT 0'),
            ('approvals','current_escalation_to','INTEGER'),
            ('notifications','notification_type','VARCHAR(30)'),
            ('notifications','notif_priority','VARCHAR(20)'),
            ('audit_logs','module_name','VARCHAR(50)'),('audit_logs','action_type','VARCHAR(50)'),
            ('audit_logs','record_id','INTEGER'),('audit_logs','old_data','TEXT'),
            ('audit_logs','new_data','TEXT'),('audit_logs','ip_address','VARCHAR(50)'),
            ('audit_logs','user_agent','VARCHAR(300)'),
            # Phase 10A: Super Admin columns on users table
            # is_super_admin: flags the user as a platform-level super admin
            # tenant_id: links user to a specific tenant (NULL = platform-level user)
            ('users','is_super_admin','BOOLEAN DEFAULT 0'),
            ('users','tenant_id','INTEGER'),
        ]:
            try: conn.execute(_sa.text(f'ALTER TABLE {tbl} ADD COLUMN {col} {typ}')); conn.commit()
            except: pass
_safe_migrate()
logger.info("Database tables created/verified ✅")

_INDEXES = [
    Index("ix_tasks_created_by",  models.Task.created_by_id),
    Index("ix_tasks_assigned_to", models.Task.assigned_to_id),
    Index("ix_tasks_status",      models.Task.status),
    Index("ix_tasks_priority",    models.Task.priority),
    Index("ix_audit_user",        models.AuditLog.user_id),
    Index("ix_audit_timestamp",   models.AuditLog.timestamp),
    Index("ix_notif_user",        models.Notification.user_id),
    Index("ix_notif_read",        models.Notification.is_read),
    Index("ix_comments_task",     models.Comment.task_id),
    Index("ix_approvals_status",  models.Approval.status),
    Index("ix_activity_entity",   models.ActivityLog.entity_type),
    Index("ix_activity_ts",       models.ActivityLog.timestamp),
]
with engine.connect() as conn:
    for idx in _INDEXES:
        try: idx.create(engine, checkfirst=True)
        except Exception: pass
logger.info("Database indexes verified ✅")

app = FastAPI(
    title="Mini Enterprise Collaboration App — Phase 10A",
    description="Phase 1-7: Auth, Tasks, Kanban, Approvals, Documents, Audit, "
                "Notifications, AI, WebSockets, Activity, Role Dashboards, SaaS, Billing. "
                "Phase 10A: SaaS Tenant Onboarding, Workspaces, Channels, Super Admin.",
    version="10.0.0",
)

# ── Middleware ────────────────────────────────────────────────
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
# Phase 1-3
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tasks_router)
app.include_router(approvals_router)
app.include_router(dashboard_router)
app.include_router(documents_router)
app.include_router(audit_router)
app.include_router(notifications_router)

# Phase 4-7
app.include_router(ws_router)
app.include_router(activity_router)
app.include_router(role_dashboard_router)
app.include_router(ai_router)
app.include_router(saas_router)
app.include_router(sla_router)
app.include_router(escalation_router)
app.include_router(notif_pref_router)
app.include_router(enhanced_audit_router)

# Phase 10A: Tenant + Workspace + Channel + Super Admin
app.include_router(tenants_router)
app.include_router(super_admin_router)   # NEW: /super-admin/* endpoints
add_pagination(app)

logger.info("All Phase 1-10A routers registered ✅")


@app.get("/")
def root():
    return {"message": "Mini Enterprise Collaboration API v10.0 — Tenant Workspace & Channel Foundation ✅"}


@app.get("/health")
def health():
    from app.services.cache_service import get_cache_stats
    from app.websocket.connection_manager import manager
    return {
        "status":      "healthy",
        "version":     "10.0.0",
        "cache_stats": get_cache_stats(),
        "active_ws":   manager.active_connection_count(),
    }
