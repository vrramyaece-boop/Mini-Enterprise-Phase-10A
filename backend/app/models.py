# models.py — SQLAlchemy 2.0 (ALL phases 1-8)
# Mapped[T] = mapped_column(...)  — NO Column()
# server_default=func.now()       — NO default=datetime.utcnow

import logging
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

logger = logging.getLogger(__name__)

class User(Base):
    __tablename__ = "users"
    id:              Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    name:            Mapped[str]           = mapped_column(String(100), nullable=False)
    email:           Mapped[str]           = mapped_column(String(100), unique=True, nullable=False)
    hashed_password: Mapped[str]           = mapped_column(String(255), nullable=False)
    role:            Mapped[str]           = mapped_column(String(20), default="employee")
    # Phase 10A: super_admin is a platform-level role (not scoped to any tenant)
    is_super_admin:  Mapped[bool]          = mapped_column(Boolean, default=False)
    # Phase 10A: tenant_id links a user to a specific tenant (NULL = platform-level user)
    tenant_id:       Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenants.id"), nullable=True)
    is_active:       Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:      Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    updated_at:      Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    tasks_created:    Mapped[List["Task"]]            = relationship("Task", foreign_keys="Task.created_by_id",  back_populates="creator")
    tasks_assigned:   Mapped[List["Task"]]            = relationship("Task", foreign_keys="Task.assigned_to_id", back_populates="assignee")
    tasks_updated:    Mapped[List["Task"]]            = relationship("Task", foreign_keys="Task.updated_by_id",  back_populates="updater")
    comments:         Mapped[List["Comment"]]         = relationship("Comment",         back_populates="author")
    approvals_made:   Mapped[List["Approval"]]        = relationship("Approval",        foreign_keys="Approval.requested_by_id", back_populates="requester")
    approval_actions: Mapped[List["ApprovalHistory"]] = relationship("ApprovalHistory", back_populates="actor")
    status_changes:   Mapped[List["StatusHistory"]]   = relationship("StatusHistory",   back_populates="changed_by_user")

class Task(Base):
    __tablename__ = "tasks"
    id:             Mapped[int]                = mapped_column(Integer, primary_key=True, index=True)
    title:          Mapped[str]                = mapped_column(String(200), nullable=False)
    description:    Mapped[Optional[str]]      = mapped_column(Text, nullable=True)
    status:         Mapped[str]                = mapped_column(String(20), default="todo")
    priority:       Mapped[str]                = mapped_column(String(20), default="medium")
    due_date:       Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by_id:  Mapped[int]                = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id: Mapped[Optional[int]]      = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id:  Mapped[Optional[int]]      = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at:     Mapped[datetime]           = mapped_column(DateTime, server_default=func.now())
    updated_at:     Mapped[datetime]           = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    # Phase 8: SLA fields
    sla_status:      Mapped[Optional[str]]      = mapped_column(String(20), nullable=True)
    sla_due_time:    Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_sla_breached: Mapped[bool]               = mapped_column(Boolean, default=False)
    creator:        Mapped["User"]               = relationship("User", foreign_keys=[created_by_id],  back_populates="tasks_created")
    assignee:       Mapped[Optional["User"]]     = relationship("User", foreign_keys=[assigned_to_id], back_populates="tasks_assigned")
    updater:        Mapped[Optional["User"]]     = relationship("User", foreign_keys=[updated_by_id],  back_populates="tasks_updated")
    comments:       Mapped[List["Comment"]]      = relationship("Comment",       back_populates="task", cascade="all, delete-orphan")
    status_history: Mapped[List["StatusHistory"]]= relationship("StatusHistory", back_populates="task", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    task_id:     Mapped[int]      = mapped_column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id:     Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    content:     Mapped[str]      = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool]     = mapped_column(Boolean, default=False)
    created_at:  Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    task:   Mapped["Task"] = relationship("Task", back_populates="comments")
    author: Mapped["User"] = relationship("User", back_populates="comments")

class StatusHistory(Base):
    __tablename__ = "status_history"
    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    task_id:     Mapped[int]      = mapped_column(Integer, ForeignKey("tasks.id"), nullable=False)
    changed_by:  Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    from_status: Mapped[str]      = mapped_column(String(20), nullable=False)
    to_status:   Mapped[str]      = mapped_column(String(20), nullable=False)
    changed_at:  Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    task:            Mapped["Task"] = relationship("Task", back_populates="status_history")
    changed_by_user: Mapped["User"] = relationship("User", back_populates="status_changes")

class Approval(Base):
    __tablename__ = "approvals"
    id:              Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    title:           Mapped[str]           = mapped_column(String(200), nullable=False)
    description:     Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requested_by_id: Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status:          Mapped[str]           = mapped_column(String(20), default="pending")
    current_level:   Mapped[str]           = mapped_column(String(20), default="manager")
    created_at:      Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    updated_at:      Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    # Phase 8: SLA + Escalation fields
    sla_status:            Mapped[Optional[str]]      = mapped_column(String(20), nullable=True)
    sla_due_time:          Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_escalated:          Mapped[bool]               = mapped_column(Boolean, default=False)
    current_escalation_to: Mapped[Optional[int]]      = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    requester: Mapped["User"]                  = relationship("User", foreign_keys=[requested_by_id], back_populates="approvals_made")
    history:   Mapped[List["ApprovalHistory"]] = relationship("ApprovalHistory", back_populates="approval", cascade="all, delete-orphan")

class ApprovalHistory(Base):
    __tablename__ = "approval_history"
    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    approval_id:  Mapped[int]           = mapped_column(Integer, ForeignKey("approvals.id"), nullable=False)
    action_by_id: Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    action:       Mapped[str]           = mapped_column(String(30), nullable=False)
    comment:      Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at:   Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    approval: Mapped["Approval"] = relationship("Approval", back_populates="history")
    actor:    Mapped["User"]     = relationship("User",     back_populates="approval_actions")

class Document(Base):
    __tablename__ = "documents"
    id:          Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    file_name:   Mapped[str]           = mapped_column(String(255), nullable=False)
    file_path:   Mapped[str]           = mapped_column(String(500), nullable=False)
    file_size:   Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type:   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    version:     Mapped[int]           = mapped_column(Integer, default=1)
    uploaded_by: Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    task_id:     Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tasks.id"), nullable=True)
    created_at:  Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    uploader: Mapped["User"]           = relationship("User", foreign_keys=[uploaded_by])
    task:     Mapped[Optional["Task"]] = relationship("Task", foreign_keys=[task_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id:        Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    user_id:   Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    action:    Mapped[str]           = mapped_column(String(100), nullable=False)
    entity:    Mapped[str]           = mapped_column(String(50),  nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    detail:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    # Phase 8: enhanced fields
    module_name: Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    action_type: Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    record_id:   Mapped[Optional[int]] = mapped_column(Integer,     nullable=True)
    old_data:    Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    new_data:    Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    ip_address:  Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    user_agent:  Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    actor: Mapped["User"] = relationship("User", foreign_keys=[user_id])

class Notification(Base):
    __tablename__ = "notifications"
    id:         Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    user_id:    Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    message:    Mapped[str]           = mapped_column(String(500), nullable=False)
    is_read:    Mapped[bool]          = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    # Phase 8: notification type + priority
    notification_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    notif_priority:    Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    recipient: Mapped["User"] = relationship("User", foreign_keys=[user_id])

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    user_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    token:      Mapped[str]      = mapped_column(String(512), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked:    Mapped[bool]     = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    user_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    token:      Mapped[str]      = mapped_column(String(256), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used:       Mapped[bool]     = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id:          Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    user_id:     Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    entity_type: Mapped[str]           = mapped_column(String(30), nullable=False)
    entity_id:   Mapped[int]           = mapped_column(Integer, nullable=False)
    entity_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    action:      Mapped[str]           = mapped_column(String(50), nullable=False)
    before_val:  Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    after_val:   Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp:   Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), index=True)
    actor: Mapped["User"] = relationship("User", foreign_keys=[user_id])

class TaskAssignmentScore(Base):
    __tablename__ = "task_assignment_scores"
    id:                  Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    user_id:             Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    active_tasks:        Mapped[int]      = mapped_column(Integer, default=0)
    completed_tasks:     Mapped[int]      = mapped_column(Integer, default=0)
    avg_completion_days: Mapped[int]      = mapped_column(Integer, default=0)
    last_updated:        Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

class Organization(Base):
    __tablename__ = "organizations"
    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    name:       Mapped[str]      = mapped_column(String(200), nullable=False)
    slug:       Mapped[str]      = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan:       Mapped[str]      = mapped_column(String(20), default="basic")
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    users:         Mapped[List["OrganizationUser"]] = relationship("OrganizationUser", back_populates="organization")
    subscriptions: Mapped[List["Subscription"]]     = relationship("Subscription",     back_populates="organization")

class OrganizationUser(Base):
    __tablename__ = "organization_users"
    id:              Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int]      = mapped_column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id:         Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    role:            Mapped[str]      = mapped_column(String(20), default="employee")
    joined_at:       Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
    user:         Mapped["User"]         = relationship("User", foreign_keys=[user_id])

class Subscription(Base):
    __tablename__ = "subscriptions"
    id:              Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int]           = mapped_column(Integer, ForeignKey("organizations.id"), nullable=False)
    plan:            Mapped[str]           = mapped_column(String(20), nullable=False)
    credits:         Mapped[int]           = mapped_column(Integer, default=0)
    billing_cycle:   Mapped[str]           = mapped_column(String(20), default="monthly")
    status:          Mapped[str]           = mapped_column(String(20), default="active")
    started_at:      Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    expires_at:      Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    organization: Mapped["Organization"] = relationship("Organization", back_populates="subscriptions")

class Payment(Base):
    __tablename__ = "payments"
    id:                 Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    organization_id:    Mapped[int]           = mapped_column(Integer, ForeignKey("organizations.id"), nullable=False)
    gateway:            Mapped[str]           = mapped_column(String(20), nullable=False)
    gateway_order_id:   Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    gateway_payment_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    amount:             Mapped[int]           = mapped_column(Integer, nullable=False)
    currency:           Mapped[str]           = mapped_column(String(10), default="INR")
    status:             Mapped[str]           = mapped_column(String(20), default="pending")
    plan:               Mapped[str]           = mapped_column(String(20), nullable=False)
    created_at:         Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id])

# ════════════════ PHASE 8 MODELS ════════════════════════════

class SLARule(Base):
    __tablename__ = "sla_rules"
    id:                     Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    module_name:            Mapped[str]      = mapped_column(String(50), nullable=False)
    priority:               Mapped[str]      = mapped_column(String(20), nullable=False)
    allowed_hours:          Mapped[int]      = mapped_column(Integer, nullable=False)
    escalation_enabled:     Mapped[bool]     = mapped_column(Boolean, default=False)
    escalation_after_hours: Mapped[int]      = mapped_column(Integer, default=0)
    is_active:              Mapped[bool]     = mapped_column(Boolean, default=True)
    created_by:             Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at:             Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at:             Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])

class SLATracking(Base):
    __tablename__ = "sla_tracking"
    id:             Mapped[int]                = mapped_column(Integer, primary_key=True, index=True)
    module_name:    Mapped[str]                = mapped_column(String(50), nullable=False)
    record_id:      Mapped[int]                = mapped_column(Integer, nullable=False, index=True)
    sla_rule_id:    Mapped[int]                = mapped_column(Integer, ForeignKey("sla_rules.id"), nullable=False)
    start_time:     Mapped[datetime]           = mapped_column(DateTime, nullable=False)
    due_time:       Mapped[datetime]           = mapped_column(DateTime, nullable=False)
    completed_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status:         Mapped[str]                = mapped_column(String(20), default="active")
    breach_reason:  Mapped[Optional[str]]      = mapped_column(Text, nullable=True)
    created_at:     Mapped[datetime]           = mapped_column(DateTime, server_default=func.now())
    updated_at:     Mapped[datetime]           = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    sla_rule: Mapped["SLARule"] = relationship("SLARule", foreign_keys=[sla_rule_id])

class ApprovalEscalation(Base):
    __tablename__ = "approval_escalations"
    id:               Mapped[int]                = mapped_column(Integer, primary_key=True, index=True)
    approval_id:      Mapped[int]                = mapped_column(Integer, ForeignKey("approvals.id"), nullable=False)
    escalated_from:   Mapped[int]                = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    escalated_to:     Mapped[int]                = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    reason:           Mapped[str]                = mapped_column(Text, nullable=False)
    escalation_level: Mapped[int]                = mapped_column(Integer, default=1)
    status:           Mapped[str]                = mapped_column(String(20), default="pending")
    escalated_at:     Mapped[datetime]           = mapped_column(DateTime, server_default=func.now())
    resolved_at:      Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approval:  Mapped["Approval"] = relationship("Approval",  foreign_keys=[approval_id])
    from_user: Mapped["User"]     = relationship("User",      foreign_keys=[escalated_from])
    to_user:   Mapped["User"]     = relationship("User",      foreign_keys=[escalated_to])

class ApprovalDelegation(Base):
    __tablename__ = "approval_delegations"
    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    delegator_id: Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    delegatee_id: Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    start_date:   Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date:     Mapped[datetime] = mapped_column(DateTime, nullable=False)
    reason:       Mapped[str]      = mapped_column(Text, nullable=False)
    is_active:    Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    delegator: Mapped["User"] = relationship("User", foreign_keys=[delegator_id])
    delegatee: Mapped["User"] = relationship("User", foreign_keys=[delegatee_id])

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    id:                       Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    user_id:                  Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    in_app_enabled:           Mapped[bool]     = mapped_column(Boolean, default=True)
    email_enabled:            Mapped[bool]     = mapped_column(Boolean, default=False)
    task_notifications:       Mapped[bool]     = mapped_column(Boolean, default=True)
    approval_notifications:   Mapped[bool]     = mapped_column(Boolean, default=True)
    escalation_notifications: Mapped[bool]     = mapped_column(Boolean, default=True)
    document_notifications:   Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:               Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at:               Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


# ════════════════════════════════════════════════════════════════
# PHASE 10A MODELS — Tenant Workspace & Channel Foundation
# ════════════════════════════════════════════════════════════════

class Tenant(Base):
    """Module 1: SaaS tenant / organization."""
    __tablename__ = "tenants"

    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    name:          Mapped[str]           = mapped_column(String(200), nullable=False)
    slug:          Mapped[str]           = mapped_column(String(100), unique=True, nullable=False, index=True)
    contact_email: Mapped[str]           = mapped_column(String(200), unique=True, nullable=False)
    phone:         Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    address:       Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry:      Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status:        Mapped[str]           = mapped_column(String(20), default="TRIAL")
    created_at:    Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    updated_at:    Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    onboarding:   Mapped[Optional["TenantOnboarding"]]             = relationship("TenantOnboarding",  back_populates="tenant", uselist=False)
    settings:     Mapped[Optional["TenantCollaborationSettings"]]  = relationship("TenantCollaborationSettings", back_populates="tenant", uselist=False)
    usage:        Mapped[Optional["TenantCollaborationUsage"]]     = relationship("TenantCollaborationUsage",    back_populates="tenant", uselist=False)
    workspaces:   Mapped[List["Workspace"]]                        = relationship("Workspace",          back_populates="tenant")


class TenantOnboarding(Base):
    """Module 2: Tenant onboarding status and first admin."""
    __tablename__ = "tenant_onboarding"

    id:                        Mapped[int]                = mapped_column(Integer, primary_key=True, index=True)
    tenant_id:                 Mapped[int]                = mapped_column(Integer, ForeignKey("tenants.id"), unique=True, nullable=False)
    admin_user_id:             Mapped[Optional[int]]      = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    onboarding_status:         Mapped[str]                = mapped_column(String(20), default="PENDING")
    default_workspace_created: Mapped[bool]               = mapped_column(Boolean, default=False)
    settings_created:          Mapped[bool]               = mapped_column(Boolean, default=False)
    completed_at:              Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at:                Mapped[datetime]           = mapped_column(DateTime, server_default=func.now())

    tenant:     Mapped["Tenant"]         = relationship("Tenant",    back_populates="onboarding")
    admin_user: Mapped[Optional["User"]] = relationship("User",      foreign_keys=[admin_user_id])


class TenantCollaborationSettings(Base):
    """Module 3: Per-tenant collaboration limits and feature flags."""
    __tablename__ = "tenant_collaboration_settings"

    id:                       Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    tenant_id:                Mapped[int]      = mapped_column(Integer, ForeignKey("tenants.id"), unique=True, nullable=False)
    max_workspaces:           Mapped[int]      = mapped_column(Integer, default=5)
    max_channels_per_workspace: Mapped[int]    = mapped_column(Integer, default=20)
    max_workspace_members:    Mapped[int]      = mapped_column(Integer, default=50)
    max_storage_mb:           Mapped[int]      = mapped_column(Integer, default=1024)
    workspace_enabled:        Mapped[bool]     = mapped_column(Boolean, default=True)
    channel_enabled:          Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:               Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at:               Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="settings")


class TenantCollaborationUsage(Base):
    """Module 4: Tracks actual collaboration usage per tenant."""
    __tablename__ = "tenant_collaboration_usage"

    id:                 Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    tenant_id:          Mapped[int]      = mapped_column(Integer, ForeignKey("tenants.id"), unique=True, nullable=False)
    workspace_count:    Mapped[int]      = mapped_column(Integer, default=0)
    channel_count:      Mapped[int]      = mapped_column(Integer, default=0)
    member_count:       Mapped[int]      = mapped_column(Integer, default=0)
    storage_used_mb:    Mapped[int]      = mapped_column(Integer, default=0)
    last_calculated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="usage")


class Workspace(Base):
    """Module 5: Tenant-scoped collaboration workspace."""
    __tablename__ = "workspaces"

    id:          Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    tenant_id:   Mapped[int]           = mapped_column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name:        Mapped[str]           = mapped_column(String(200), nullable=False)
    slug:        Mapped[str]           = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url:  Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    visibility:  Mapped[str]           = mapped_column(String(10), default="PUBLIC")
    created_by:  Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    is_archived: Mapped[bool]          = mapped_column(Boolean, default=False)
    created_at:  Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    updated_at:  Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    tenant:   Mapped["Tenant"]           = relationship("Tenant",   back_populates="workspaces")
    creator:  Mapped["User"]             = relationship("User",     foreign_keys=[created_by])
    members:  Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    channels: Mapped[List["Channel"]]    = relationship("Channel",  back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    """Module 6: Workspace membership with roles."""
    __tablename__ = "workspace_members"

    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    workspace_id: Mapped[int]      = mapped_column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id:      Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    role:         Mapped[str]      = mapped_column(String(20), default="member")
    joined_at:    Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    is_active:    Mapped[bool]     = mapped_column(Boolean, default=True)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")
    user:      Mapped["User"]      = relationship("User",      foreign_keys=[user_id])


class Channel(Base):
    """Module 7: Channels inside workspaces."""
    __tablename__ = "channels"

    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    tenant_id:    Mapped[int]           = mapped_column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    workspace_id: Mapped[int]           = mapped_column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    name:         Mapped[str]           = mapped_column(String(200), nullable=False)
    description:  Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    channel_type: Mapped[str]           = mapped_column(String(20), default="PUBLIC")
    created_by:   Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    is_archived:  Mapped[bool]          = mapped_column(Boolean, default=False)
    created_at:   Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    updated_at:   Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    tenant:    Mapped["Tenant"]              = relationship("Tenant",    foreign_keys=[tenant_id])
    workspace: Mapped["Workspace"]           = relationship("Workspace", back_populates="channels")
    creator:   Mapped["User"]               = relationship("User",      foreign_keys=[created_by])
    members:   Mapped[List["ChannelMember"]] = relationship("ChannelMember", back_populates="channel", cascade="all, delete-orphan")


class ChannelMember(Base):
    """Module 7: Channel membership."""
    __tablename__ = "channel_members"

    id:                  Mapped[int]           = mapped_column(Integer, primary_key=True, index=True)
    channel_id:          Mapped[int]           = mapped_column(Integer, ForeignKey("channels.id"), nullable=False, index=True)
    user_id:             Mapped[int]           = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at:           Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())
    is_muted:            Mapped[bool]          = mapped_column(Boolean, default=False)
    last_read_message_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    channel: Mapped["Channel"] = relationship("Channel", back_populates="members")
    user:    Mapped["User"]    = relationship("User",    foreign_keys=[user_id])
