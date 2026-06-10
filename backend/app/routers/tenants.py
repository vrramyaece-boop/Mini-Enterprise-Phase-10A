# routers/tenants.py — Phase 10A: All tenant + workspace + channel endpoints
# THIN ROUTER — all logic in tenant_service.py
#
# CRITICAL RULE — FastAPI route ordering:
#   Static paths like /tenants/onboard MUST come BEFORE
#   dynamic paths like /tenants/{tenant_id}, otherwise FastAPI
#   treats "onboard" as a tenant_id value and raises a 422 error.
#
# ACCESS LEVELS:
#   Modules 1–4 (tenant/onboarding/settings/usage) → require_super_admin
#   Modules 5–7 (workspace/members/channels)       → get_current_user

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_super_admin
from app import models, schemas
from app.services import tenant_service

router = APIRouter(tags=["Phase 10A — Tenants, Workspaces & Channels"])


# ═══════════════════════════════════════════════════════════════
# MODULE 2 (static routes first) — TENANT ONBOARDING
# POST /tenants/onboard must be BEFORE GET /tenants/{tenant_id}
# ═══════════════════════════════════════════════════════════════

@router.post("/tenants/onboard")
def onboard_tenant(
    body: schemas.TenantOnboardRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """
    Create tenant + first admin + settings + optional default workspace in one call.
    Super Admin only.
    """
    result = tenant_service.onboard_tenant(db, body, current_user)
    return {
        "message":    "Tenant onboarded successfully",
        "tenant":     schemas.TenantOut.model_validate(result["tenant"]),
        "onboarding": schemas.TenantOnboardingOut.model_validate(result["onboarding"]),
        "workspace":  schemas.WorkspaceOut.model_validate(result["workspace"]) if result["workspace"] else None,
    }


# ═══════════════════════════════════════════════════════════════
# MODULE 1 — TENANT MANAGEMENT  (Super Admin only)
# ═══════════════════════════════════════════════════════════════

@router.post("/tenants", response_model=schemas.TenantOut, status_code=201)
def create_tenant(
    body: schemas.TenantCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Create a new SaaS tenant. Super Admin only."""
    return tenant_service.create_tenant(db, body, current_user)


@router.get("/tenants", response_model=list[schemas.TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """List all tenants. Super Admin only."""
    return tenant_service.list_tenants(db, current_user)


@router.get("/tenants/{tenant_id}", response_model=schemas.TenantOut)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """View one tenant. Super Admin only."""
    return tenant_service.get_tenant(db, tenant_id, current_user)


@router.put("/tenants/{tenant_id}", response_model=schemas.TenantOut)
def update_tenant(
    tenant_id: int,
    body: schemas.TenantUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Update tenant details. Super Admin only."""
    return tenant_service.update_tenant(db, tenant_id, body, current_user)


@router.patch("/tenants/{tenant_id}/suspend", response_model=schemas.TenantOut)
def suspend_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Suspend tenant access. Super Admin only."""
    return tenant_service.suspend_tenant(db, tenant_id, current_user)


@router.patch("/tenants/{tenant_id}/activate", response_model=schemas.TenantOut)
def activate_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Activate suspended tenant. Super Admin only."""
    return tenant_service.activate_tenant(db, tenant_id, current_user)


# ═══════════════════════════════════════════════════════════════
# MODULE 2 (dynamic routes) — TENANT ONBOARDING
# ═══════════════════════════════════════════════════════════════

@router.post("/tenants/{tenant_id}/admin", response_model=schemas.UserOut, status_code=201)
def create_tenant_admin(
    tenant_id: int,
    body: schemas.TenantAdminCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Create the first admin for an existing tenant. Super Admin only."""
    return tenant_service.create_tenant_admin(db, tenant_id, body, current_user)


@router.get("/tenants/{tenant_id}/onboarding-status", response_model=schemas.TenantOnboardingOut)
def get_onboarding_status(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Check onboarding progress for a tenant. Super Admin only."""
    return tenant_service.get_onboarding_status(db, tenant_id, current_user)


# ═══════════════════════════════════════════════════════════════
# MODULE 3 — TENANT COLLABORATION SETTINGS  (Super Admin only)
# ═══════════════════════════════════════════════════════════════

@router.get("/tenants/{tenant_id}/collaboration/settings",
            response_model=schemas.TenantSettingsOut)
def get_collab_settings(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """View tenant collaboration settings. Super Admin only."""
    return tenant_service.get_collab_settings(db, tenant_id, current_user)


@router.put("/tenants/{tenant_id}/collaboration/settings",
            response_model=schemas.TenantSettingsOut)
def update_collab_settings(
    tenant_id: int,
    body: schemas.TenantSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Update collaboration settings (limits + feature flags). Super Admin only."""
    return tenant_service.update_collab_settings(db, tenant_id, body, current_user)


# ═══════════════════════════════════════════════════════════════
# MODULE 4 — TENANT COLLABORATION USAGE  (Super Admin only)
# ═══════════════════════════════════════════════════════════════

@router.get("/tenants/{tenant_id}/collaboration/usage",
            response_model=schemas.TenantUsageOut)
def get_collab_usage(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """View current collaboration usage for a tenant. Super Admin only."""
    return tenant_service.get_collab_usage(db, tenant_id, current_user)


@router.post("/tenants/{tenant_id}/collaboration/recalculate-usage",
             response_model=schemas.TenantUsageOut)
def recalculate_usage(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    """Recalculate live workspace/channel/member counts. Super Admin only."""
    return tenant_service.recalculate_usage(db, tenant_id, current_user)


# ═══════════════════════════════════════════════════════════════
# MODULE 5 — WORKSPACE MANAGEMENT  (Authenticated users)
# ═══════════════════════════════════════════════════════════════

@router.post("/workspaces", response_model=schemas.WorkspaceOut, status_code=201)
def create_workspace(
    body: schemas.WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a workspace for a tenant. Checks workspace limit."""
    return tenant_service.create_workspace(db, body, current_user)


@router.get("/workspaces", response_model=list[schemas.WorkspaceOut])
def list_workspaces(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List workspaces for a tenant. ?tenant_id=X"""
    return tenant_service.list_workspaces(db, tenant_id, current_user)


@router.get("/workspaces/{workspace_id}", response_model=schemas.WorkspaceOut)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """View workspace details."""
    return tenant_service.get_workspace(db, workspace_id, current_user)


@router.put("/workspaces/{workspace_id}", response_model=schemas.WorkspaceOut)
def update_workspace(
    workspace_id: int,
    body: schemas.WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update workspace name, description, visibility."""
    return tenant_service.update_workspace(db, workspace_id, body, current_user)


@router.patch("/workspaces/{workspace_id}/archive", response_model=schemas.WorkspaceOut)
def archive_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Archive a workspace."""
    return tenant_service.archive_workspace(db, workspace_id, current_user)


@router.patch("/workspaces/{workspace_id}/restore", response_model=schemas.WorkspaceOut)
def restore_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Restore an archived workspace."""
    return tenant_service.restore_workspace(db, workspace_id, current_user)


# ═══════════════════════════════════════════════════════════════
# MODULE 6 — WORKSPACE MEMBERSHIP  (Authenticated users)
# ═══════════════════════════════════════════════════════════════

@router.post("/workspaces/{workspace_id}/members",
             response_model=schemas.WorkspaceMemberOut, status_code=201)
def add_member(
    workspace_id: int,
    body: schemas.WorkspaceMemberAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a user to a workspace. Checks member limit + prevents duplicates."""
    return tenant_service.add_workspace_member(db, workspace_id, body, current_user)


@router.get("/workspaces/{workspace_id}/members",
            response_model=list[schemas.WorkspaceMemberOut])
def list_members(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all active members of a workspace."""
    return tenant_service.list_workspace_members(db, workspace_id, current_user)


@router.patch("/workspaces/{workspace_id}/members/{user_id}/role",
              response_model=schemas.WorkspaceMemberOut)
def update_member_role(
    workspace_id: int,
    user_id: int,
    body: schemas.WorkspaceMemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a workspace member's role."""
    return tenant_service.update_member_role(db, workspace_id, user_id, body, current_user)


@router.delete("/workspaces/{workspace_id}/members/{user_id}")
def remove_member(
    workspace_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a member from a workspace."""
    return tenant_service.remove_workspace_member(db, workspace_id, user_id, current_user)


# ═══════════════════════════════════════════════════════════════
# MODULE 7 — CHANNEL MANAGEMENT  (Authenticated users)
# ═══════════════════════════════════════════════════════════════

@router.post("/channels", response_model=schemas.ChannelOut, status_code=201)
def create_channel(
    body: schemas.ChannelCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a channel inside a workspace. Checks channel limit. Blocks cross-tenant."""
    return tenant_service.create_channel(db, body, current_user)


@router.get("/workspaces/{workspace_id}/channels",
            response_model=list[schemas.ChannelOut])
def list_channels(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all channels inside a workspace."""
    return tenant_service.list_channels(db, workspace_id, current_user)


@router.get("/channels/{channel_id}", response_model=schemas.ChannelOut)
def get_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """View channel details."""
    return tenant_service.get_channel(db, channel_id, current_user)


@router.put("/channels/{channel_id}", response_model=schemas.ChannelOut)
def update_channel(
    channel_id: int,
    body: schemas.ChannelUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update channel name, description, type."""
    return tenant_service.update_channel(db, channel_id, body, current_user)


@router.patch("/channels/{channel_id}/archive", response_model=schemas.ChannelOut)
def archive_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Archive a channel."""
    return tenant_service.archive_channel(db, channel_id, current_user)


@router.patch("/channels/{channel_id}/restore", response_model=schemas.ChannelOut)
def restore_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Restore an archived channel."""
    return tenant_service.restore_channel(db, channel_id, current_user)


@router.post("/channels/{channel_id}/join",
             response_model=schemas.ChannelMemberOut, status_code=201)
def join_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Join a public/announcement/project channel."""
    return tenant_service.join_channel(db, channel_id, current_user)


@router.post("/channels/{channel_id}/leave")
def leave_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Leave a channel."""
    return tenant_service.leave_channel(db, channel_id, current_user)
