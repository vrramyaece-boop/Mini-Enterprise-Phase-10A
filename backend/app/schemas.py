# schemas.py — Phase 1 + Phase 2 (fully corrected)
# FIX 1: Added StatusHistoryOut schema (spec §5.2 "Track status history")
# FIX 2: Added PerformanceInsights schema (spec §5.5 "Performance insights")

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── USER ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     Optional[str] = "employee"

class UserOut(BaseModel):
    id:             int
    name:           str
    email:          str
    role:           str
    is_active:      bool
    is_super_admin: bool = False        # Phase 10A: platform-level super admin flag
    tenant_id:      Optional[int] = None # Phase 10A: which tenant this user belongs to
    created_at:     datetime
    class Config:
        from_attributes = True


# ── AUTH ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"


# ── TASK ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title:          str
    description:    Optional[str] = None
    status:         Optional[str] = "todo"
    priority:       Optional[str] = "medium"
    due_date:       Optional[datetime] = None
    assigned_to_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title:          Optional[str] = None
    description:    Optional[str] = None
    status:         Optional[str] = None
    priority:       Optional[str] = None
    due_date:       Optional[datetime] = None

class TaskAssign(BaseModel):
    assigned_to_id: int

# FIX: used by PATCH /tasks/{id}/status
class TaskStatusUpdate(BaseModel):
    status: str   # todo / in_progress / review / done

class TaskOut(BaseModel):
    id:              int
    title:           str
    description:     Optional[str]
    status:          str
    priority:        str
    due_date:        Optional[datetime]
    created_by_id:   int
    assigned_to_id:  Optional[int]
    updated_by_id:   Optional[int]
    created_at:      datetime
    updated_at:      datetime
    # Phase 8: SLA fields
    sla_status:      Optional[str]      = None
    sla_due_time:    Optional[datetime] = None
    is_sla_breached: Optional[bool]     = False
    class Config:
        from_attributes = True


# ── STATUS HISTORY (spec §5.2 "Track status history") ────────────────────────
# Every Kanban move is stored: who moved it, from where, to where, when

class StatusHistoryOut(BaseModel):
    id:              int
    task_id:         int
    changed_by:      int
    from_status:     str
    to_status:       str
    changed_at:      datetime
    changed_by_user: Optional[UserOut] = None   # full user info nested
    class Config:
        from_attributes = True


# ── COMMENT ───────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content:     str
    is_internal: Optional[bool] = False

class CommentOut(BaseModel):
    id:          int
    task_id:     int
    user_id:     int
    content:     str
    is_internal: bool
    created_at:  datetime
    author:      Optional[UserOut] = None   # real author name/role nested
    class Config:
        from_attributes = True


# ── APPROVAL ──────────────────────────────────────────────────────────────────

class ApprovalCreate(BaseModel):
    title:       str
    description: Optional[str] = None

class ApprovalAction(BaseModel):
    action:  str            # approved / rejected / on_hold / escalate
    comment: Optional[str] = None   # mandatory when action = "rejected"

class ApprovalHistoryOut(BaseModel):
    id:           int
    approval_id:  int
    action_by_id: int
    action:       str
    comment:      Optional[str]
    created_at:   datetime
    actor:        Optional[UserOut] = None
    class Config:
        from_attributes = True

class ApprovalOut(BaseModel):
    id:                    int
    title:                 str
    description:           Optional[str]
    requested_by_id:       int
    status:                str
    current_level:         str
    created_at:            datetime
    updated_at:            datetime
    requester:             Optional[UserOut] = None
    history:               List[ApprovalHistoryOut] = []
    # Phase 8: SLA + Escalation fields
    sla_status:            Optional[str]      = None
    sla_due_time:          Optional[datetime] = None
    is_escalated:          Optional[bool]     = False
    current_escalation_to: Optional[int]      = None
    class Config:
        from_attributes = True


# ── DASHBOARD ─────────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_tasks:       int
    todo:              int
    in_progress:       int
    review:            int
    done:              int
    pending_approvals: int
    completed_tasks:   int

class TaskDistribution(BaseModel):
    status: str
    count:  int

# FIX: Performance insights schema (spec §5.5 "Performance insights")
class PerformanceInsights(BaseModel):
    completion_rate:       float   # % of tasks marked done
    in_review_rate:        float   # % currently in review
    overdue_tasks:         int     # tasks past due_date and not done
    avg_comments_per_task: float   # collaboration activity metric


# ════════════════════════════════════════════════════════════════
# PHASE 3 SCHEMAS
# ════════════════════════════════════════════════════════════════

# ── DOCUMENT ──────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id:          int
    file_name:   str
    file_path:   str
    file_size:   Optional[int]
    mime_type:   Optional[str]
    version:     int
    uploaded_by: int
    task_id:     Optional[int]
    created_at:  datetime
    uploader:    Optional[UserOut] = None
    class Config:
        from_attributes = True


# ── AUDIT LOG ─────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id:        int
    user_id:   int
    action:    str
    entity:    str
    entity_id: Optional[int]
    detail:    Optional[str]
    timestamp: datetime
    actor:     Optional[UserOut] = None
    class Config:
        from_attributes = True


# ── NOTIFICATION ──────────────────────────────────────────────

class NotificationOut(BaseModel):
    id:         int
    user_id:    int
    message:    str
    is_read:    bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── AI SUMMARY ────────────────────────────────────────────────

class AISummary(BaseModel):
    total_pending:       int
    high_priority_count: int
    delayed_count:       int
    summary_text:        str         # e.g. "3 high priority tasks pending"
    insights:            List[str]   # list of insight strings
    activity_feed:       List[str]   # recent actions as readable strings


# ════════════════════════════════════════════════════════════════
# PHASE 4 SCHEMAS
# ════════════════════════════════════════════════════════════════

class TokenPair(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token:        str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str

class PaginatedTasks(BaseModel):
    items:       List[TaskOut]
    total:       int
    page:        int
    page_size:   int
    total_pages: int

class PaginatedAuditLogs(BaseModel):
    items:       List[AuditLogOut]
    total:       int
    page:        int
    page_size:   int
    total_pages: int

class PaginatedNotifications(BaseModel):
    items:       List[NotificationOut]
    total:       int
    page:        int
    page_size:   int
    total_pages: int


# ════════════════════════════════════════════════════════════════
# PHASE 5 SCHEMAS
# ════════════════════════════════════════════════════════════════

class ActivityLogOut(BaseModel):
    id:          int
    user_id:     int
    entity_type: str
    entity_id:   int
    entity_name: Optional[str]
    action:      str
    before_val:  Optional[str]
    after_val:   Optional[str]
    description: Optional[str]
    timestamp:   datetime
    actor:       Optional[UserOut] = None
    class Config:
        from_attributes = True

class PaginatedActivityLogs(BaseModel):
    items:       List[ActivityLogOut]
    total:       int
    page:        int
    page_size:   int
    total_pages: int

class EmployeeDashboard(BaseModel):
    assigned_tasks:   List[TaskOut]
    pending_requests: int
    my_comments:      int
    my_notifications: int
    completion_rate:  float
    task_breakdown:   dict

class ManagerDashboard(BaseModel):
    team_tasks:        List[TaskOut]
    pending_approvals: int
    team_members:      int
    overdue_tasks:     int
    team_completion:   float
    approval_summary:  dict
    recent_activity:   List[ActivityLogOut]

class AdminDashboard(BaseModel):
    total_users:        int
    total_tasks:        int
    total_approvals:    int
    total_documents:    int
    system_health:      dict
    user_breakdown:     dict
    task_status_dist:   dict
    recent_audit_logs:  List[AuditLogOut]
    active_ws_sessions: int


# ════════════════════════════════════════════════════════════════
# PHASE 6 SCHEMAS
# ════════════════════════════════════════════════════════════════

class SmartAssignSuggestion(BaseModel):
    user_id:       int
    user_name:     str
    active_tasks:  int
    score:         float
    reason:        str

class AITaskInsight(BaseModel):
    task_id:      int
    task_title:   str
    risk_level:   str         # low / medium / high
    risk_reason:  str
    suggestion:   str


# ════════════════════════════════════════════════════════════════
# PHASE 7 SCHEMAS
# ════════════════════════════════════════════════════════════════

class OrganizationCreate(BaseModel):
    name: str
    slug: str
    plan: Optional[str] = "basic"

class OrganizationOut(BaseModel):
    id:        int
    name:      str
    slug:      str
    plan:      str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class SubscriptionOut(BaseModel):
    id:              int
    organization_id: int
    plan:            str
    credits:         int
    status:          str
    started_at:      datetime
    expires_at:      Optional[datetime]
    class Config:
        from_attributes = True

class PaymentInitiate(BaseModel):
    organization_id: int
    plan:            str        # basic / silver / gold
    gateway:         str        # razorpay / stripe

class PaymentVerify(BaseModel):
    gateway_order_id:   str
    gateway_payment_id: Optional[str] = None
    organization_id:    int
    gateway:            Optional[str] = None

class PaymentOut(BaseModel):
    id:                 int
    organization_id:    int
    gateway:            str
    gateway_order_id:   Optional[str]
    gateway_payment_id: Optional[str]
    amount:             int
    currency:           str
    status:             str
    plan:               str
    created_at:         datetime
    class Config:
        from_attributes = True

PLAN_FEATURES = {
    "basic":  {"max_users": 5,   "max_tasks": 50,  "credits": 100,  "price_inr": 0},
    "silver": {"max_users": 20,  "max_tasks": 500, "credits": 500,  "price_inr": 999},
    "gold":   {"max_users": 100, "max_tasks": 5000,"credits": 2000, "price_inr": 2999},
}


# ════════════════════════════════════════════════════════════════
# PHASE 8 SCHEMAS
# ════════════════════════════════════════════════════════════════

class SLARuleCreate(BaseModel):
    module_name:            str
    priority:               str
    allowed_hours:          int
    escalation_enabled:     bool = False
    escalation_after_hours: int  = 0

class SLARuleUpdate(BaseModel):
    module_name:            Optional[str]  = None
    priority:               Optional[str]  = None
    allowed_hours:          Optional[int]  = None
    escalation_enabled:     Optional[bool] = None
    escalation_after_hours: Optional[int]  = None
    is_active:              Optional[bool] = None

class SLARuleOut(BaseModel):
    id:int; module_name:str; priority:str; allowed_hours:int
    escalation_enabled:bool; escalation_after_hours:int; is_active:bool
    created_by:int; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

class SLATrackingOut(BaseModel):
    id:int; module_name:str; record_id:int; sla_rule_id:int
    start_time:datetime; due_time:datetime; completed_time:Optional[datetime]
    status:str; breach_reason:Optional[str]; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

class SLACompleteRequest(BaseModel):
    breach_reason: Optional[str] = None

class ApprovalEscalationCreate(BaseModel):
    approval_id:int; escalated_to:int; reason:str; escalation_level:int=1

class ApprovalEscalationResolve(BaseModel):
    resolution_note: Optional[str] = None

class ApprovalEscalationOut(BaseModel):
    id:int; approval_id:int; escalated_from:int; escalated_to:int
    reason:str; escalation_level:int; status:str; escalated_at:datetime; resolved_at:Optional[datetime]
    class Config: from_attributes=True

class ApprovalDelegationCreate(BaseModel):
    delegatee_id:int; start_date:datetime; end_date:datetime; reason:str

class ApprovalDelegationOut(BaseModel):
    id:int; delegator_id:int; delegatee_id:int; start_date:datetime
    end_date:datetime; reason:str; is_active:bool; created_at:datetime
    class Config: from_attributes=True

class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled:Optional[bool]=None; email_enabled:Optional[bool]=None
    task_notifications:Optional[bool]=None; approval_notifications:Optional[bool]=None
    escalation_notifications:Optional[bool]=None; document_notifications:Optional[bool]=None

class NotificationPreferenceOut(BaseModel):
    id:int; user_id:int; in_app_enabled:bool; email_enabled:bool
    task_notifications:bool; approval_notifications:bool
    escalation_notifications:bool; document_notifications:bool
    created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

class AuditLogOutEnhanced(BaseModel):
    id:int; user_id:int; action:str; entity:str; entity_id:Optional[int]
    detail:Optional[str]; timestamp:datetime; module_name:Optional[str]
    action_type:Optional[str]; record_id:Optional[int]; old_data:Optional[str]
    new_data:Optional[str]; ip_address:Optional[str]; user_agent:Optional[str]
    actor:Optional[UserOut]=None
    class Config: from_attributes=True


# ════════════════════════════════════════════════════════════════
# PHASE 10A SCHEMAS — Tenant, Workspace, Channel
# ════════════════════════════════════════════════════════════════

# ── TENANT ───────────────────────────────────────────────────

class TenantCreate(BaseModel):
    name:          str
    contact_email: str
    phone:         Optional[str] = None
    address:       Optional[str] = None
    industry:      Optional[str] = None
    slug:          Optional[str] = None   # auto-generated if not provided

class TenantUpdate(BaseModel):
    name:          Optional[str] = None
    contact_email: Optional[str] = None
    phone:         Optional[str] = None
    address:       Optional[str] = None
    industry:      Optional[str] = None

class TenantOut(BaseModel):
    id: int; name: str; slug: str; contact_email: str
    phone: Optional[str]; address: Optional[str]; industry: Optional[str]
    status: str; created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

# ── TENANT ONBOARDING ─────────────────────────────────────────

class TenantOnboardRequest(BaseModel):
    """Create tenant + first admin in one call."""
    tenant_name:    str
    contact_email:  str
    industry:       Optional[str] = None
    phone:          Optional[str] = None
    admin_name:     str
    admin_email:    str
    admin_password: str
    create_default_workspace: bool = True

class TenantAdminCreate(BaseModel):
    name:     str
    email:    str
    password: str

class TenantOnboardingOut(BaseModel):
    id: int; tenant_id: int; admin_user_id: Optional[int]
    onboarding_status: str; default_workspace_created: bool
    settings_created: bool; completed_at: Optional[datetime]; created_at: datetime
    class Config: from_attributes = True

# ── TENANT COLLABORATION SETTINGS ────────────────────────────

class TenantSettingsUpdate(BaseModel):
    max_workspaces:             Optional[int]  = None
    max_channels_per_workspace: Optional[int]  = None
    max_workspace_members:      Optional[int]  = None
    max_storage_mb:             Optional[int]  = None
    workspace_enabled:          Optional[bool] = None
    channel_enabled:            Optional[bool] = None

class TenantSettingsOut(BaseModel):
    id: int; tenant_id: int; max_workspaces: int
    max_channels_per_workspace: int; max_workspace_members: int
    max_storage_mb: int; workspace_enabled: bool; channel_enabled: bool
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

# ── TENANT COLLABORATION USAGE ────────────────────────────────

class TenantUsageOut(BaseModel):
    id: int; tenant_id: int; workspace_count: int; channel_count: int
    member_count: int; storage_used_mb: int; last_calculated_at: datetime
    class Config: from_attributes = True

# ── WORKSPACE ─────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    tenant_id:   int
    name:        str
    description: Optional[str] = None
    visibility:  str = "PUBLIC"
    avatar_url:  Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    visibility:  Optional[str] = None
    avatar_url:  Optional[str] = None

class WorkspaceOut(BaseModel):
    id: int; tenant_id: int; name: str; slug: str
    description: Optional[str]; avatar_url: Optional[str]
    visibility: str; created_by: int; is_archived: bool
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

# ── WORKSPACE MEMBER ──────────────────────────────────────────

class WorkspaceMemberAdd(BaseModel):
    user_id: int
    role:    str = "member"   # workspace_admin / moderator / member / viewer

class WorkspaceMemberRoleUpdate(BaseModel):
    role: str

class WorkspaceMemberOut(BaseModel):
    id: int; workspace_id: int; user_id: int; role: str
    joined_at: datetime; is_active: bool
    class Config: from_attributes = True

# ── CHANNEL ───────────────────────────────────────────────────

class ChannelCreate(BaseModel):
    workspace_id: int
    tenant_id:    int
    name:         str
    description:  Optional[str] = None
    channel_type: str = "PUBLIC"   # PUBLIC / PRIVATE / ANNOUNCEMENT / PROJECT

class ChannelUpdate(BaseModel):
    name:         Optional[str] = None
    description:  Optional[str] = None
    channel_type: Optional[str] = None

class ChannelOut(BaseModel):
    id: int; tenant_id: int; workspace_id: int; name: str
    description: Optional[str]; channel_type: str; created_by: int
    is_archived: bool; created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

class ChannelMemberOut(BaseModel):
    id: int; channel_id: int; user_id: int; joined_at: datetime
    is_muted: bool; last_read_message_id: Optional[int]
    class Config: from_attributes = True


# ════════════════════════════════════════════════════════════════
# PHASE 10A — SUPER ADMIN SCHEMAS
# ════════════════════════════════════════════════════════════════

class SuperAdminCreate(BaseModel):
    """Create a new platform-level Super Admin user."""
    name:     str
    email:    str
    password: str


class SuperAdminOut(BaseModel):
    """Response for a Super Admin user."""
    id:             int
    name:           str
    email:          str
    role:           str
    is_super_admin: bool
    is_active:      bool
    tenant_id:      Optional[int] = None
    created_at:     datetime
    class Config: from_attributes = True


class PlatformStatsOut(BaseModel):
    """High-level platform statistics only visible to Super Admins."""
    total_tenants:          int
    active_tenants:         int
    suspended_tenants:      int
    trial_tenants:          int
    total_workspaces:       int
    total_channels:         int
    total_users:            int
    total_super_admins:     int


class TenantSummaryOut(BaseModel):
    """Enriched tenant info with usage — for Super Admin dashboard."""
    id:            int
    name:          str
    slug:          str
    contact_email: str
    industry:      Optional[str]
    status:        str
    created_at:    datetime
    workspace_count: int = 0
    channel_count:   int = 0
    member_count:    int = 0
    class Config: from_attributes = True
