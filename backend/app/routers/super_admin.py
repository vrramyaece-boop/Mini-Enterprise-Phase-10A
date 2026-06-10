# routers/super_admin.py — Phase 10A: Platform-Level Super Admin Endpoints
# 
# What is a Super Admin?
# ─────────────────────────────────────────────────────────────
# A Super Admin is a special platform-level user who can manage ALL tenants.
# Unlike a regular "admin" (who is scoped to one organization/tenant),
# a Super Admin has no tenant restriction — they see and control everything.
#
# Super Admin capabilities:
#   - Create other Super Admins
#   - List all Super Admins on the platform
#   - Deactivate Super Admins
#   - View platform-level stats (total tenants, users, workspaces, etc.)
#   - List all tenants with enriched usage info
#
# All endpoints here require: is_super_admin == True
# ─────────────────────────────────────────────────────────────

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_super_admin
from app import models, schemas
from app.auth import hash_password

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/super-admin",
    tags=["Phase 10A — Super Admin (Platform Level)"]
)


# ═══════════════════════════════════════════════════════════════
# CREATE SUPER ADMIN
# Only an existing Super Admin can create a new Super Admin.
# ═══════════════════════════════════════════════════════════════

@router.post("/create", response_model=schemas.SuperAdminOut, status_code=201)
def create_super_admin(
    body: schemas.SuperAdminCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin)
):
    """
    Create a new Super Admin user.

    Only an existing Super Admin can call this endpoint.

    Example request body:
        {
          "name": "Platform Admin",
          "email": "platform@example.com",
          "password": "SecurePass@123"
        }

    The created user will have:
        - role = "admin"
        - is_super_admin = True
        - tenant_id = None  (not scoped to any tenant)
    """
    # Check if email is already taken
    existing = db.execute(
        select(models.User).where(models.User.email == body.email)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create the super admin user (tenant_id = None = platform-level)
    super_admin = models.User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role="admin",            # Role is "admin" but with super powers
        is_super_admin=True,     # This is what grants platform-level access
        is_active=True,
        tenant_id=None           # Super admins don't belong to a single tenant
    )
    db.add(super_admin)
    db.commit()
    db.refresh(super_admin)

    logger.info(f"Super Admin created: {super_admin.email} by {current_user.email}")
    return super_admin


# ═══════════════════════════════════════════════════════════════
# LIST ALL SUPER ADMINS
# ═══════════════════════════════════════════════════════════════

@router.get("/list", response_model=list[schemas.SuperAdminOut])
def list_super_admins(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin)
):
    """
    List all Super Admin users on the platform.
    Only Super Admins can see this list.
    """
    super_admins = db.execute(
        select(models.User)
        .where(models.User.is_super_admin == True)
        .order_by(models.User.created_at.desc())
    ).scalars().all()

    return super_admins


# ═══════════════════════════════════════════════════════════════
# DEACTIVATE A SUPER ADMIN
# ═══════════════════════════════════════════════════════════════

@router.patch("/{user_id}/deactivate", response_model=schemas.SuperAdminOut)
def deactivate_super_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin)
):
    """
    Deactivate a Super Admin account.

    Safety rule: A Super Admin cannot deactivate themselves.
    This prevents accidentally locking out the last super admin.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own Super Admin account"
        )

    target = db.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.is_super_admin == True
        )
    ).scalar_one_or_none()

    if not target:
        raise HTTPException(status_code=404, detail="Super Admin not found")

    if not target.is_active:
        raise HTTPException(status_code=400, detail="Super Admin is already inactive")

    target.is_active = False
    db.commit()
    db.refresh(target)

    logger.info(f"Super Admin deactivated: {target.email} by {current_user.email}")
    return target


# ═══════════════════════════════════════════════════════════════
# REACTIVATE A SUPER ADMIN
# ═══════════════════════════════════════════════════════════════

@router.patch("/{user_id}/activate", response_model=schemas.SuperAdminOut)
def activate_super_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin)
):
    """Reactivate a previously deactivated Super Admin account."""
    target = db.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.is_super_admin == True
        )
    ).scalar_one_or_none()

    if not target:
        raise HTTPException(status_code=404, detail="Super Admin not found")

    if target.is_active:
        raise HTTPException(status_code=400, detail="Super Admin is already active")

    target.is_active = True
    db.commit()
    db.refresh(target)

    logger.info(f"Super Admin reactivated: {target.email} by {current_user.email}")
    return target


# ═══════════════════════════════════════════════════════════════
# PLATFORM STATS  (Dashboard for Super Admins)
# ═══════════════════════════════════════════════════════════════

@router.get("/platform-stats", response_model=schemas.PlatformStatsOut)
def get_platform_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin)
):
    """
    Get platform-wide statistics.
    Only Super Admins can view this.

    Returns counts of tenants by status, total workspaces,
    channels, users, and super admins on the platform.
    """
    # Count tenants by status
    total_tenants    = db.execute(select(func.count()).select_from(models.Tenant)).scalar_one()
    active_tenants   = db.execute(select(func.count()).select_from(models.Tenant).where(models.Tenant.status == "ACTIVE")).scalar_one()
    suspended_tenants= db.execute(select(func.count()).select_from(models.Tenant).where(models.Tenant.status == "SUSPENDED")).scalar_one()
    trial_tenants    = db.execute(select(func.count()).select_from(models.Tenant).where(models.Tenant.status == "TRIAL")).scalar_one()

    # Count workspaces & channels across all tenants
    total_workspaces = db.execute(select(func.count()).select_from(models.Workspace)).scalar_one()
    total_channels   = db.execute(select(func.count()).select_from(models.Channel)).scalar_one()

    # Count users and super admins
    total_users       = db.execute(select(func.count()).select_from(models.User)).scalar_one()
    total_super_admins= db.execute(select(func.count()).select_from(models.User).where(models.User.is_super_admin == True)).scalar_one()

    return schemas.PlatformStatsOut(
        total_tenants=total_tenants,
        active_tenants=active_tenants,
        suspended_tenants=suspended_tenants,
        trial_tenants=trial_tenants,
        total_workspaces=total_workspaces,
        total_channels=total_channels,
        total_users=total_users,
        total_super_admins=total_super_admins,
    )


# ═══════════════════════════════════════════════════════════════
# LIST ALL TENANTS WITH USAGE SUMMARY
# ═══════════════════════════════════════════════════════════════

@router.get("/tenants", response_model=list[schemas.TenantSummaryOut])
def list_all_tenants_with_usage(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin)
):
    """
    List all tenants with their usage summary.
    Only Super Admins can see cross-tenant data.

    Each tenant entry shows: name, slug, status, industry,
    and current workspace/channel/member counts.
    """
    tenants = db.execute(
        select(models.Tenant).order_by(models.Tenant.created_at.desc())
    ).scalars().all()

    result = []
    for tenant in tenants:
        # Get usage record (it may not exist for older tenants)
        usage = db.execute(
            select(models.TenantCollaborationUsage).where(
                models.TenantCollaborationUsage.tenant_id == tenant.id
            )
        ).scalar_one_or_none()

        result.append(schemas.TenantSummaryOut(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            contact_email=tenant.contact_email,
            industry=tenant.industry,
            status=tenant.status,
            created_at=tenant.created_at,
            workspace_count=usage.workspace_count if usage else 0,
            channel_count=usage.channel_count   if usage else 0,
            member_count=usage.member_count     if usage else 0,
        ))

    return result


# ═══════════════════════════════════════════════════════════════
# VIEW MY OWN SUPER ADMIN PROFILE
# ═══════════════════════════════════════════════════════════════

@router.get("/me", response_model=schemas.SuperAdminOut)
def get_my_super_admin_profile(
    current_user: models.User = Depends(require_super_admin)
):
    """
    Get the current Super Admin's own profile.
    Useful for the frontend to display the Super Admin dashboard.
    """
    return current_user
