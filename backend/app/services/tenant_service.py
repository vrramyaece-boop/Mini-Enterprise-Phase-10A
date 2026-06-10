# services/tenant_service.py — Phase 10A: All 7 modules
# SQLAlchemy 2.0: select() + execute() — NO db.query()
import logging, re
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException
from app import models, schemas
from app.auth import hash_password

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════

def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")[:80]


def _unique_slug(db: Session, base: str, model, field) -> str:
    slug = _slugify(base)
    existing = db.execute(select(model).where(getattr(model, field) == slug)).scalar_one_or_none()
    if not existing:
        return slug
    # Add numeric suffix
    for i in range(2, 100):
        candidate = f"{slug}-{i}"
        if not db.execute(select(model).where(getattr(model, field) == candidate)).scalar_one_or_none():
            return candidate
    return f"{slug}-{datetime.utcnow().timestamp():.0f}"


def _get_tenant_or_404(db: Session, tenant_id: int) -> models.Tenant:
    tenant = db.execute(select(models.Tenant).where(
        models.Tenant.id == tenant_id)).scalar_one_or_none()
    if not tenant: raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


def _get_settings_or_create(db: Session, tenant_id: int) -> models.TenantCollaborationSettings:
    settings = db.execute(select(models.TenantCollaborationSettings).where(
        models.TenantCollaborationSettings.tenant_id == tenant_id)).scalar_one_or_none()
    if not settings:
        settings = models.TenantCollaborationSettings(tenant_id=tenant_id)
        db.add(settings); db.commit(); db.refresh(settings)
    return settings


def _get_usage_or_create(db: Session, tenant_id: int) -> models.TenantCollaborationUsage:
    usage = db.execute(select(models.TenantCollaborationUsage).where(
        models.TenantCollaborationUsage.tenant_id == tenant_id)).scalar_one_or_none()
    if not usage:
        usage = models.TenantCollaborationUsage(tenant_id=tenant_id)
        db.add(usage); db.commit(); db.refresh(usage)
    return usage


def _require_admin_access(current_user: models.User):
    """
    Allow access if the user is:
    - a regular admin (role == 'admin'), OR
    - a super admin (is_super_admin == True)

    This is used for all tenant/workspace/channel management operations.
    Super admins have cross-tenant access; regular admins are tenant-scoped.
    """
    if current_user.is_super_admin:
        return  # Super admin can do everything
    if current_user.role == "admin":
        return  # Regular tenant admin is also allowed
    raise HTTPException(
        status_code=403,
        detail="Admin or Super Admin access required"
    )


# ════════════════════════════════════════════════════════════════
# MODULE 1: TENANT MANAGEMENT
# ════════════════════════════════════════════════════════════════

def create_tenant(db: Session, data: schemas.TenantCreate, current_user: models.User) -> models.Tenant:
    _require_admin_access(current_user)
    # Prevent duplicate email
    if db.execute(select(models.Tenant).where(models.Tenant.contact_email == data.contact_email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant with this email already exists")
    # Auto-generate slug
    slug = data.slug if data.slug else _unique_slug(db, data.name, models.Tenant, "slug")
    if db.execute(select(models.Tenant).where(models.Tenant.slug == slug)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Slug '{slug}' already taken")
    tenant = models.Tenant(name=data.name, slug=slug, contact_email=data.contact_email,
        phone=data.phone, address=data.address, industry=data.industry, status="TRIAL")
    db.add(tenant); db.commit(); db.refresh(tenant)
    # Auto-create default settings + usage
    db.add(models.TenantCollaborationSettings(tenant_id=tenant.id))
    db.add(models.TenantCollaborationUsage(tenant_id=tenant.id))
    db.commit()
    logger.info(f"Tenant created: {tenant.name} ({tenant.slug})")
    return tenant


def list_tenants(db: Session, current_user: models.User) -> list:
    _require_admin_access(current_user)
    return db.execute(select(models.Tenant).order_by(models.Tenant.created_at.desc())).scalars().all()


def get_tenant(db: Session, tenant_id: int, current_user: models.User) -> models.Tenant:
    _require_admin_access(current_user)
    return _get_tenant_or_404(db, tenant_id)


def update_tenant(db: Session, tenant_id: int, data: schemas.TenantUpdate,
                   current_user: models.User) -> models.Tenant:
    _require_admin_access(current_user)
    tenant = _get_tenant_or_404(db, tenant_id)
    if data.name:          tenant.name          = data.name
    if data.contact_email: tenant.contact_email = data.contact_email
    if data.phone:         tenant.phone         = data.phone
    if data.address:       tenant.address       = data.address
    if data.industry:      tenant.industry      = data.industry
    db.commit(); db.refresh(tenant)
    return tenant


def suspend_tenant(db: Session, tenant_id: int, current_user: models.User) -> models.Tenant:
    _require_admin_access(current_user)
    tenant = _get_tenant_or_404(db, tenant_id)
    if tenant.status == "SUSPENDED":
        raise HTTPException(status_code=400, detail="Tenant is already suspended")
    tenant.status = "SUSPENDED"; db.commit(); db.refresh(tenant)
    logger.info(f"Tenant suspended: {tenant.name}")
    return tenant


def activate_tenant(db: Session, tenant_id: int, current_user: models.User) -> models.Tenant:
    _require_admin_access(current_user)
    tenant = _get_tenant_or_404(db, tenant_id)
    tenant.status = "ACTIVE"; db.commit(); db.refresh(tenant)
    logger.info(f"Tenant activated: {tenant.name}")
    return tenant


# ════════════════════════════════════════════════════════════════
# MODULE 2: TENANT ONBOARDING
# ════════════════════════════════════════════════════════════════

def onboard_tenant(db: Session, data: schemas.TenantOnboardRequest,
                    current_user: models.User) -> dict:
    """Create tenant + first admin + settings + optional default workspace."""
    _require_admin_access(current_user)
    # Prevent duplicate email
    if db.execute(select(models.Tenant).where(
            models.Tenant.contact_email == data.contact_email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant email already registered")
    if db.execute(select(models.User).where(
            models.User.email == data.admin_email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Admin email already registered")
    # Create tenant
    slug   = _unique_slug(db, data.tenant_name, models.Tenant, "slug")
    tenant = models.Tenant(name=data.tenant_name, slug=slug,
        contact_email=data.contact_email, industry=data.industry,
        phone=data.phone, status="ACTIVE")
    db.add(tenant); db.flush()
    # Create first admin user — linked to this tenant
    admin = models.User(name=data.admin_name, email=data.admin_email,
        hashed_password=hash_password(data.admin_password), role="admin",
        is_active=True, is_super_admin=False, tenant_id=tenant.id)
    db.add(admin); db.flush()
    # Create onboarding record
    onboarding = models.TenantOnboarding(
        tenant_id=tenant.id, admin_user_id=admin.id,
        onboarding_status="PENDING", settings_created=False, default_workspace_created=False)
    db.add(onboarding); db.flush()
    # Create collaboration settings
    db.add(models.TenantCollaborationSettings(tenant_id=tenant.id))
    db.add(models.TenantCollaborationUsage(tenant_id=tenant.id))
    onboarding.settings_created = True
    # Optionally create default workspace
    workspace = None
    if data.create_default_workspace:
        ws_slug = _unique_slug(db, f"{data.tenant_name}-general", models.Workspace, "slug")
        workspace = models.Workspace(tenant_id=tenant.id, name="General",
            slug=ws_slug, description="Default workspace", visibility="PUBLIC",
            created_by=admin.id)
        db.add(workspace); db.flush()
        # Add admin as workspace admin
        db.add(models.WorkspaceMember(workspace_id=workspace.id,
            user_id=admin.id, role="workspace_admin"))
        onboarding.default_workspace_created = True
    onboarding.onboarding_status = "COMPLETED"
    onboarding.completed_at      = datetime.utcnow()
    db.commit()
    logger.info(f"Tenant onboarded: {tenant.name}, admin: {admin.email}")
    return {"tenant": tenant, "admin_user": admin,
            "onboarding": onboarding, "workspace": workspace}


def create_tenant_admin(db: Session, tenant_id: int, data: schemas.TenantAdminCreate,
                         current_user: models.User) -> models.User:
    _require_admin_access(current_user)
    _get_tenant_or_404(db, tenant_id)
    if db.execute(select(models.User).where(models.User.email == data.email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(name=data.name, email=data.email,
        hashed_password=hash_password(data.password), role="admin",
        is_active=True, is_super_admin=False, tenant_id=tenant_id)
    db.add(user); db.flush()
    onboarding = db.execute(select(models.TenantOnboarding).where(
        models.TenantOnboarding.tenant_id == tenant_id)).scalar_one_or_none()
    if onboarding and not onboarding.admin_user_id:
        onboarding.admin_user_id = user.id
        onboarding.onboarding_status = "COMPLETED"
        onboarding.completed_at      = datetime.utcnow()
    db.commit(); db.refresh(user)
    return user


def get_onboarding_status(db: Session, tenant_id: int, current_user: models.User) -> models.TenantOnboarding:
    _require_admin_access(current_user)
    _get_tenant_or_404(db, tenant_id)
    onboarding = db.execute(select(models.TenantOnboarding).where(
        models.TenantOnboarding.tenant_id == tenant_id)).scalar_one_or_none()
    if not onboarding:
        raise HTTPException(status_code=404, detail="No onboarding record found for this tenant")
    return onboarding


# ════════════════════════════════════════════════════════════════
# MODULE 3: COLLABORATION SETTINGS
# ════════════════════════════════════════════════════════════════

def get_collab_settings(db: Session, tenant_id: int, current_user: models.User):
    _require_admin_access(current_user)
    _get_tenant_or_404(db, tenant_id)
    return _get_settings_or_create(db, tenant_id)


def update_collab_settings(db: Session, tenant_id: int, data: schemas.TenantSettingsUpdate,
                             current_user: models.User):
    _require_admin_access(current_user)
    _get_tenant_or_404(db, tenant_id)
    settings = _get_settings_or_create(db, tenant_id)
    if data.max_workspaces             is not None: settings.max_workspaces             = data.max_workspaces
    if data.max_channels_per_workspace is not None: settings.max_channels_per_workspace = data.max_channels_per_workspace
    if data.max_workspace_members      is not None: settings.max_workspace_members      = data.max_workspace_members
    if data.max_storage_mb             is not None: settings.max_storage_mb             = data.max_storage_mb
    if data.workspace_enabled          is not None: settings.workspace_enabled          = data.workspace_enabled
    if data.channel_enabled            is not None: settings.channel_enabled            = data.channel_enabled
    db.commit(); db.refresh(settings)
    return settings


# ════════════════════════════════════════════════════════════════
# MODULE 4: COLLABORATION USAGE
# ════════════════════════════════════════════════════════════════

def get_collab_usage(db: Session, tenant_id: int, current_user: models.User):
    _require_admin_access(current_user)
    _get_tenant_or_404(db, tenant_id)
    return _get_usage_or_create(db, tenant_id)


def recalculate_usage(db: Session, tenant_id: int, current_user: models.User):
    _require_admin_access(current_user)
    _get_tenant_or_404(db, tenant_id)
    usage = _get_usage_or_create(db, tenant_id)
    # Count workspaces (active)
    usage.workspace_count = db.execute(select(func.count()).select_from(models.Workspace).where(
        models.Workspace.tenant_id == tenant_id, models.Workspace.is_archived == False)).scalar_one()
    # Count channels (active)
    usage.channel_count = db.execute(select(func.count()).select_from(models.Channel).where(
        models.Channel.tenant_id == tenant_id, models.Channel.is_archived == False)).scalar_one()
    # Count workspace members (active)
    usage.member_count = db.execute(select(func.count()).select_from(models.WorkspaceMember).where(
        models.WorkspaceMember.workspace_id.in_(
            select(models.Workspace.id).where(models.Workspace.tenant_id == tenant_id)
        ),
        models.WorkspaceMember.is_active == True
    )).scalar_one()
    usage.last_calculated_at = datetime.utcnow()
    db.commit(); db.refresh(usage)
    logger.info(f"Usage recalculated for tenant {tenant_id}: "
                f"{usage.workspace_count} workspaces, {usage.channel_count} channels")
    return usage


# ════════════════════════════════════════════════════════════════
# MODULE 5: WORKSPACE MANAGEMENT
# ════════════════════════════════════════════════════════════════

def _check_workspace_limit(db: Session, tenant_id: int):
    settings = _get_settings_or_create(db, tenant_id)
    if not settings.workspace_enabled:
        raise HTTPException(status_code=403, detail="Workspace feature is disabled for this tenant")
    count = db.execute(select(func.count()).select_from(models.Workspace).where(
        models.Workspace.tenant_id == tenant_id, models.Workspace.is_archived == False)).scalar_one()
    if count >= settings.max_workspaces:
        raise HTTPException(status_code=400,
            detail=f"Workspace limit reached ({settings.max_workspaces}). Upgrade your plan.")


def create_workspace(db: Session, data: schemas.WorkspaceCreate, current_user: models.User) -> models.Workspace:
    tenant = _get_tenant_or_404(db, data.tenant_id)
    if tenant.status == "SUSPENDED":
        raise HTTPException(status_code=403, detail="Tenant is suspended")
    _check_workspace_limit(db, data.tenant_id)
    slug = _unique_slug(db, data.name, models.Workspace, "slug")
    ws   = models.Workspace(tenant_id=data.tenant_id, name=data.name, slug=slug,
        description=data.description, visibility=data.visibility,
        avatar_url=data.avatar_url, created_by=current_user.id)
    db.add(ws); db.flush()
    # Auto-add creator as workspace_admin
    db.add(models.WorkspaceMember(workspace_id=ws.id, user_id=current_user.id, role="workspace_admin"))
    db.commit(); db.refresh(ws)
    logger.info(f"Workspace created: {ws.name} (tenant {data.tenant_id})")
    return ws


def list_workspaces(db: Session, tenant_id: int, current_user: models.User) -> list:
    _get_tenant_or_404(db, tenant_id)
    return db.execute(select(models.Workspace).where(
        models.Workspace.tenant_id == tenant_id
    ).order_by(models.Workspace.created_at.desc())).scalars().all()


def get_workspace(db: Session, workspace_id: int, current_user: models.User) -> models.Workspace:
    ws = db.execute(select(models.Workspace).where(models.Workspace.id == workspace_id)).scalar_one_or_none()
    if not ws: raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


def update_workspace(db: Session, workspace_id: int, data: schemas.WorkspaceUpdate,
                      current_user: models.User) -> models.Workspace:
    ws = get_workspace(db, workspace_id, current_user)
    if data.name:        ws.name        = data.name
    if data.description: ws.description = data.description
    if data.visibility:  ws.visibility  = data.visibility
    if data.avatar_url:  ws.avatar_url  = data.avatar_url
    db.commit(); db.refresh(ws)
    return ws


def archive_workspace(db: Session, workspace_id: int, current_user: models.User) -> models.Workspace:
    ws = get_workspace(db, workspace_id, current_user)
    ws.is_archived = True; db.commit(); db.refresh(ws)
    return ws


def restore_workspace(db: Session, workspace_id: int, current_user: models.User) -> models.Workspace:
    ws = get_workspace(db, workspace_id, current_user)
    ws.is_archived = False; db.commit(); db.refresh(ws)
    return ws


# ════════════════════════════════════════════════════════════════
# MODULE 6: WORKSPACE MEMBERSHIP
# ════════════════════════════════════════════════════════════════

VALID_WS_ROLES = ("workspace_admin", "moderator", "member", "viewer")


def add_workspace_member(db: Session, workspace_id: int, data: schemas.WorkspaceMemberAdd,
                          current_user: models.User) -> models.WorkspaceMember:
    ws = get_workspace(db, workspace_id, current_user)
    settings = _get_settings_or_create(db, ws.tenant_id)
    # Check member limit
    member_count = db.execute(select(func.count()).select_from(models.WorkspaceMember).where(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.is_active    == True)).scalar_one()
    if member_count >= settings.max_workspace_members:
        raise HTTPException(status_code=400,
            detail=f"Member limit reached ({settings.max_workspace_members})")
    # Prevent duplicate
    existing = db.execute(select(models.WorkspaceMember).where(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id      == data.user_id)).scalar_one_or_none()
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="User is already a member of this workspace")
        existing.is_active = True; existing.role = data.role; db.commit(); db.refresh(existing)
        return existing
    if data.role not in VALID_WS_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_WS_ROLES)}")
    if not db.execute(select(models.User).where(models.User.id == data.user_id)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")
    member = models.WorkspaceMember(workspace_id=workspace_id, user_id=data.user_id, role=data.role)
    db.add(member); db.commit(); db.refresh(member)
    return member


def list_workspace_members(db: Session, workspace_id: int, current_user: models.User) -> list:
    get_workspace(db, workspace_id, current_user)
    return db.execute(select(models.WorkspaceMember).options(
        selectinload(models.WorkspaceMember.user)
    ).where(models.WorkspaceMember.workspace_id == workspace_id,
            models.WorkspaceMember.is_active    == True)
    .order_by(models.WorkspaceMember.joined_at)).scalars().all()


def update_member_role(db: Session, workspace_id: int, user_id: int,
                        data: schemas.WorkspaceMemberRoleUpdate, current_user: models.User):
    if data.role not in VALID_WS_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_WS_ROLES)}")
    member = db.execute(select(models.WorkspaceMember).where(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id      == user_id,
        models.WorkspaceMember.is_active    == True)).scalar_one_or_none()
    if not member: raise HTTPException(status_code=404, detail="Member not found")
    member.role = data.role; db.commit(); db.refresh(member)
    return member


def remove_workspace_member(db: Session, workspace_id: int, user_id: int,
                             current_user: models.User) -> dict:
    member = db.execute(select(models.WorkspaceMember).where(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id      == user_id)).scalar_one_or_none()
    if not member: raise HTTPException(status_code=404, detail="Member not found")
    member.is_active = False; db.commit()
    return {"message": f"User {user_id} removed from workspace {workspace_id}"}


# ════════════════════════════════════════════════════════════════
# MODULE 7: CHANNEL MANAGEMENT
# ════════════════════════════════════════════════════════════════

VALID_CHANNEL_TYPES = ("PUBLIC", "PRIVATE", "ANNOUNCEMENT", "PROJECT")


def _check_channel_limit(db: Session, workspace_id: int, tenant_id: int):
    settings = _get_settings_or_create(db, tenant_id)
    if not settings.channel_enabled:
        raise HTTPException(status_code=403, detail="Channel feature is disabled for this tenant")
    count = db.execute(select(func.count()).select_from(models.Channel).where(
        models.Channel.workspace_id == workspace_id, models.Channel.is_archived == False)).scalar_one()
    if count >= settings.max_channels_per_workspace:
        raise HTTPException(status_code=400,
            detail=f"Channel limit reached ({settings.max_channels_per_workspace}) for this workspace")


def create_channel(db: Session, data: schemas.ChannelCreate, current_user: models.User) -> models.Channel:
    ws = get_workspace(db, data.workspace_id, current_user)
    # Cross-tenant check
    if ws.tenant_id != data.tenant_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access blocked")
    _check_channel_limit(db, data.workspace_id, data.tenant_id)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Channel name is required")
    if data.channel_type not in VALID_CHANNEL_TYPES:
        raise HTTPException(status_code=400,
            detail=f"channel_type must be one of: {', '.join(VALID_CHANNEL_TYPES)}")
    channel = models.Channel(tenant_id=data.tenant_id, workspace_id=data.workspace_id,
        name=data.name.strip(), description=data.description,
        channel_type=data.channel_type, created_by=current_user.id)
    db.add(channel); db.flush()
    # Auto-add creator
    db.add(models.ChannelMember(channel_id=channel.id, user_id=current_user.id))
    db.commit(); db.refresh(channel)
    logger.info(f"Channel created: {channel.name} (workspace {data.workspace_id})")
    return channel


def list_channels(db: Session, workspace_id: int, current_user: models.User) -> list:
    get_workspace(db, workspace_id, current_user)
    return db.execute(select(models.Channel).where(
        models.Channel.workspace_id == workspace_id
    ).order_by(models.Channel.created_at)).scalars().all()


def get_channel(db: Session, channel_id: int, current_user: models.User) -> models.Channel:
    ch = db.execute(select(models.Channel).where(models.Channel.id == channel_id)).scalar_one_or_none()
    if not ch: raise HTTPException(status_code=404, detail="Channel not found")
    return ch


def update_channel(db: Session, channel_id: int, data: schemas.ChannelUpdate,
                    current_user: models.User) -> models.Channel:
    ch = get_channel(db, channel_id, current_user)
    if data.name:         ch.name         = data.name.strip()
    if data.description:  ch.description  = data.description
    if data.channel_type:
        if data.channel_type not in VALID_CHANNEL_TYPES:
            raise HTTPException(status_code=400, detail="Invalid channel type")
        ch.channel_type = data.channel_type
    db.commit(); db.refresh(ch)
    return ch


def archive_channel(db: Session, channel_id: int, current_user: models.User) -> models.Channel:
    ch = get_channel(db, channel_id, current_user)
    ch.is_archived = True; db.commit(); db.refresh(ch)
    return ch


def restore_channel(db: Session, channel_id: int, current_user: models.User) -> models.Channel:
    ch = get_channel(db, channel_id, current_user)
    ch.is_archived = False; db.commit(); db.refresh(ch)
    return ch


def join_channel(db: Session, channel_id: int, current_user: models.User) -> models.ChannelMember:
    ch = get_channel(db, channel_id, current_user)
    if ch.is_archived:
        raise HTTPException(status_code=400, detail="Cannot join an archived channel")
    if ch.channel_type == "PRIVATE":
        raise HTTPException(status_code=403, detail="Cannot join a private channel directly")
    existing = db.execute(select(models.ChannelMember).where(
        models.ChannelMember.channel_id == channel_id,
        models.ChannelMember.user_id    == current_user.id)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this channel")
    member = models.ChannelMember(channel_id=channel_id, user_id=current_user.id)
    db.add(member); db.commit(); db.refresh(member)
    return member


def leave_channel(db: Session, channel_id: int, current_user: models.User) -> dict:
    member = db.execute(select(models.ChannelMember).where(
        models.ChannelMember.channel_id == channel_id,
        models.ChannelMember.user_id    == current_user.id)).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of this channel")
    db.delete(member); db.commit()
    return {"message": f"Left channel {channel_id}"}
