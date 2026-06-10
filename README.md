# Mini Enterprise Collaboration App

**Version:** 8.0.0  
**Stack:** FastAPI + SQLAlchemy 2.0 + SQLite · React 18 + Tailwind CSS  
**Architecture:** Router (thin) → Service (business logic) → Repository (DB access)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Models](#database-models)
5. [Phase 1 — Auth & Tasks](#phase-1--auth--tasks)
6. [Phase 2 — Approvals & Kanban](#phase-2--approvals--kanban)
7. [Phase 3 — Documents, Audit & Notifications](#phase-3--documents-audit--notifications)
8. [Phase 4 — Security & Performance](#phase-4--security--performance)
9. [Phase 5 — WebSockets & Activity Logs](#phase-5--websockets--activity-logs)
10. [Phase 6 — AI Insights](#phase-6--ai-insights)
11. [Phase 7 — SaaS & Billing](#phase-7--saas--billing)
12. [Phase 8 — SLA, Escalation & Enhanced Audit](#phase-8--sla-escalation--enhanced-audit)
13. [Phase 9 — Frontend Phase 8 UI](#phase-9--frontend-phase-8-ui)
14. [API Reference](#api-reference)
15. [Frontend Pages](#frontend-pages)
16. [Setup & Run](#setup--run)
17. [Environment Variables](#environment-variables)
18. [Role-Based Access Control](#role-based-access-control)
19. [SQLAlchemy 2.0 & Pagination](#sqlalchemy-20--pagination)

---

## Project Overview

A full-stack enterprise workflow collaboration system supporting:

- Multi-role user management (Admin / Manager / Employee)
- Task lifecycle management with Kanban board
- Multi-level approval workflows
- Document management with versioning
- Real-time notifications via WebSockets
- AI-powered task insights and smart assignment
- Multi-tenant SaaS with billing (Stripe + Razorpay)
- SLA tracking, escalation, and delegation
- Enhanced audit logging

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | Latest | REST API framework |
| SQLAlchemy | 2.0+ | ORM (Mapped + mapped_column) |
| SQLite | Built-in | Database (swap to MySQL/PostgreSQL in prod) |
| Pydantic | v2 | Schema validation |
| python-jose | Latest | JWT authentication |
| bcrypt | 4.0.1 | Password hashing |
| fastapi-pagination | Latest | Paginated listing APIs |
| WebSockets | Latest | Real-time events |
| Stripe / Razorpay | Latest | Payment billing |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| React Router DOM | 7 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Axios | 1.16 | HTTP client |
| @hello-pangea/dnd | 18 | Drag-and-drop Kanban |

---

## Project Structure

```
mini-enterprise/
├── backend/
│   ├── app/
│   │   ├── main.py                  # App entry point, router registration
│   │   ├── database.py              # SQLAlchemy 2.0 engine + DeclarativeBase
│   │   ├── models.py                # All 22 DB models (Mapped + mapped_column)
│   │   ├── schemas.py               # All Pydantic schemas (input/output)
│   │   ├── dependencies.py          # Auth dependencies (get_current_user)
│   │   ├── auth.py                  # JWT token utilities
│   │   ├── routers/                 # Thin routers — one per feature
│   │   │   ├── auth.py
│   │   │   ├── tasks.py
│   │   │   ├── approvals.py
│   │   │   ├── documents.py
│   │   │   ├── audit.py
│   │   │   ├── notifications.py
│   │   │   ├── dashboard.py
│   │   │   ├── users.py
│   │   │   ├── activity.py
│   │   │   ├── role_dashboard.py
│   │   │   ├── ai_insights.py
│   │   │   ├── saas.py
│   │   │   ├── websocket_router.py
│   │   │   ├── sla.py               # Phase 8
│   │   │   ├── escalation.py        # Phase 8
│   │   │   ├── notification_preferences.py  # Phase 8
│   │   │   └── enhanced_audit.py    # Phase 8
│   │   ├── services/                # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── task_service.py
│   │   │   ├── approval_service.py
│   │   │   ├── dashboard_service.py
│   │   │   ├── document_service.py
│   │   │   ├── audit_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── activity_service.py
│   │   │   ├── ai_service.py
│   │   │   ├── ai_insights_service.py
│   │   │   ├── role_dashboard_service.py
│   │   │   ├── saas_service.py
│   │   │   ├── cache_service.py
│   │   │   ├── pagination_service.py
│   │   │   ├── sla_service.py       # Phase 8
│   │   │   ├── escalation_service.py        # Phase 8
│   │   │   ├── notification_preference_service.py  # Phase 8
│   │   │   └── enhanced_audit_service.py    # Phase 8
│   │   ├── repository/              # DB access layer
│   │   │   ├── audit_repository.py
│   │   │   ├── document_repository.py
│   │   │   └── notification_repository.py
│   │   ├── middleware/
│   │   │   ├── rate_limiter.py
│   │   │   ├── input_sanitizer.py
│   │   │   └── logging_middleware.py
│   │   └── websocket/
│   │       ├── connection_manager.py
│   │       └── events.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.js                   # All routes (Phase 1-9)
    │   ├── api/axios.js             # Axios instance with auth interceptor
    │   ├── context/AuthContext.jsx  # Global auth state
    │   ├── hooks/useWebSocket.js    # WebSocket hook
    │   ├── pages/                   # 26 page components
    │   └── components/              # Reusable UI components
    ├── public/
    ├── tailwind.config.js
    └── package.json
```

---

## Database Models

| Model | Table | Phase | Description |
|---|---|---|---|
| `User` | `users` | 1 | App users with roles |
| `Task` | `tasks` | 1 | Tasks with SLA fields (Phase 8) |
| `Comment` | `comments` | 1 | Task comments |
| `StatusHistory` | `status_history` | 2 | Task status change log |
| `Approval` | `approvals` | 2 | Approval requests with SLA fields (Phase 8) |
| `ApprovalHistory` | `approval_history` | 2 | Approval action log |
| `Document` | `documents` | 3 | Uploaded files with versioning |
| `AuditLog` | `audit_logs` | 3 | System audit trail (enhanced Phase 8) |
| `Notification` | `notifications` | 3 | In-app notifications |
| `RefreshToken` | `refresh_tokens` | 4 | JWT refresh tokens |
| `PasswordResetToken` | `password_reset_tokens` | 4 | Password reset tokens |
| `ActivityLog` | `activity_logs` | 5 | Detailed activity tracking |
| `TaskAssignmentScore` | `task_assignment_scores` | 6 | AI assignment scoring |
| `Organization` | `organizations` | 7 | Multi-tenant orgs |
| `OrganizationUser` | `organization_users` | 7 | Org membership |
| `Subscription` | `subscriptions` | 7 | Plan subscriptions |
| `Payment` | `payments` | 7 | Payment records |
| `SLARule` | `sla_rules` | 8 | SLA time limit rules |
| `SLATracking` | `sla_tracking` | 8 | Per-record SLA compliance |
| `ApprovalEscalation` | `approval_escalations` | 8 | Escalation records |
| `ApprovalDelegation` | `approval_delegations` | 8 | Delegation records |
| `NotificationPreference` | `notification_preferences` | 8 | User notification settings |

**SQLAlchemy 2.0 style used throughout:**
```python
# All models use Mapped + mapped_column + func.now()
id:         Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
```

---

## Phase 1 — Auth & Tasks

### Features
- User registration and login with JWT authentication
- Role-based access: Admin / Manager / Employee
- Task CRUD with status transitions
- Task assignment and comments
- Status transition validation: `todo → in_progress → review → done`

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login (returns JWT) |
| POST | `/auth/token` | Public | Swagger UI login (OAuth2 form) |
| GET | `/auth/me` | All | Get current user profile |
| POST | `/tasks/` | Manager/Admin | Create task |
| GET | `/tasks/` | All | List tasks (paginated) |
| GET | `/tasks/{id}` | All | Get task detail |
| PUT | `/tasks/{id}` | All | Update task |
| DELETE | `/tasks/{id}` | Manager/Admin | Delete task |
| PATCH | `/tasks/{id}/assign` | Manager/Admin | Assign task to user |
| PATCH | `/tasks/{id}/status` | All | Move task status |
| GET | `/tasks/{id}/status-history` | All | Task status history |
| POST | `/tasks/{id}/comments` | All | Add comment |
| GET | `/tasks/{id}/comments` | All | List comments |

### Frontend Pages
- `/login` — Login page
- `/register` — Registration page
- `/dashboard` — Task list with SLA column
- `/tasks/create` — Create task form
- `/tasks/edit/:id` — Edit task + SLA panel

---

## Phase 2 — Approvals & Kanban

### Features
- Submit approval requests
- Multi-level approval: Manager → Admin escalation
- Approval actions: Approve / Reject / Hold / Escalate
- Kanban board with drag-and-drop (4 columns)
- Valid transitions enforced: `todo → in_progress → review → done`

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/approvals/` | All | Submit approval |
| GET | `/approvals/` | All | List approvals |
| PATCH | `/approvals/{id}/action` | Manager/Admin | Take action |
| GET | `/approvals/{id}/history` | All | Approval history |
| GET | `/tasks/kanban` | All | Get Kanban board data |

### Frontend Pages
- `/approvals` — Approval list + detail panel + Phase 8 SLA/Escalation
- `/kanban` — Drag-and-drop Kanban board with SLA badges

---

## Phase 3 — Documents, Audit & Notifications

### Features
- File upload with MIME type validation (max 10 MB)
- Document versioning (auto-increments version on same filename)
- System audit logs for all actions
- In-app notifications for assignments, approvals, comments

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/documents/upload` | All | Upload document |
| GET | `/documents/` | All | List documents |
| GET | `/documents/{id}` | All | Get document |
| GET | `/documents/{id}/download` | All | Download file |
| GET | `/audit-logs/` | Admin | Paginated audit trail |
| GET | `/notifications/` | All | Paginated notifications |
| GET | `/notifications/unread-count` | All | Unread count |
| PATCH | `/notifications/{id}/read` | All | Mark as read |
| PATCH | `/notifications/mark-all-read` | All | Mark all read |

### Frontend Pages
- `/documents` — Document list + upload
- `/audit-logs` — Basic audit log (Admin)
- `/notifications` — Notification list

---

## Phase 4 — Security & Performance

### Features
- JWT refresh token rotation (revoke-on-use)
- Password reset via token (1-hour expiry)
- Rate limiting middleware
- Input sanitization middleware
- Password change endpoint

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/refresh` | Public | Rotate refresh token |
| POST | `/auth/logout` | Auth | Revoke refresh token |
| POST | `/auth/forgot-password` | Public | Request reset token |
| POST | `/auth/reset-password` | Public | Confirm password reset |
| POST | `/auth/change-password` | Auth | Change current password |

### Frontend Pages
- `/forgot-password` — Request reset link
- `/change-password` — Change current password

---

## Phase 5 — WebSockets & Activity Logs

### Features
- WebSocket real-time notifications (task updates, kanban moves, approvals)
- Activity log tracking for all entity changes
- Role-specific dashboards (Employee / Manager / Admin)
- Live connection indicator in sidebar

### WebSocket
```
ws://localhost:8000/ws/{user_id}?token=<access_token>
```

**Events received:**
| Event | Trigger |
|---|---|
| `task_update` | Task created/updated/deleted/assigned |
| `kanban_update` | Task status moved |
| `approval_update` | Approval action taken |
| `notification` | Any notification created |
| `activity` | Any entity activity |

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/activity/` | Admin | Paginated activity log |
| GET | `/activity/{type}/{id}` | Auth | Entity history |
| GET | `/role-dashboard/employee` | Employee | Personal dashboard |
| GET | `/role-dashboard/manager` | Manager | Team dashboard |
| GET | `/role-dashboard/admin` | Admin | System dashboard |
| GET | `/ws/status` | Admin | WebSocket connections |

### Frontend Pages
- `/role-dashboard` — Role-specific dashboard view

---

## Phase 6 — AI Insights

### Features
- AI task insights with 5 risk detection rules
- Smart task assignment based on workload + historical performance

### Risk Rules
| Rule | Condition | Risk Level |
|---|---|---|
| 1 | `priority == "high"` and `status == "todo"` | 🔴 High |
| 2 | `due_date < now` (overdue) | 🔴 High |
| 3 | `due_date < now + 48h` (near deadline) | 🟡 Medium |
| 4 | `status == "in_progress"` and no update > 7 days | 🟡 Medium |
| 5 | `priority == "low"` and no due date | 🟢 Low |

### Smart Assignment Score
```
score = completed_tasks / (active_tasks + 1)
```
Higher score = fewer active tasks + more completions = better candidate.

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/ai/task-insights` | All | Risk-assessed task list |
| GET | `/ai/smart-assign/{task_id}` | Manager/Admin | Ranked assignment suggestions |
| GET | `/dashboard/ai-summary` | All | AI-powered summary |

### Frontend Pages
- `/ai-summary` — AI dashboard summary with activity feed
- `/ai-insights` — Task risk insights + smart assignment

---

## Phase 7 — SaaS & Billing

### Features
- Multi-tenant organization management
- 3 plan tiers: Basic (free) / Silver (₹999/mo) / Gold (₹2999/mo)
- Stripe hosted checkout (redirects to Stripe → returns with session ID → auto-verifies)
- Razorpay popup checkout
- Credit system per plan
- Organization member management

### Plan Limits
| Plan | Users | Tasks | Credits/month |
|---|---|---|---|
| Basic | 5 | 50 | 100 |
| Silver | 20 | 500 | 500 |
| Gold | 100 | 5,000 | 2,000 |

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/saas/organizations` | Admin | Create organization |
| GET | `/saas/organizations` | Admin | List organizations |
| PATCH | `/saas/organizations/{id}/toggle-status` | Admin | Activate/deactivate |
| PATCH | `/saas/organizations/{id}/plan` | Admin | Upgrade plan (admin-side) |
| POST | `/saas/organizations/{id}/members` | Admin | Add member |
| DELETE | `/saas/organizations/{id}/members/{uid}` | Admin | Remove member |
| GET | `/saas/organizations/{id}/credits` | Admin | Credit balance |
| POST | `/saas/billing/initiate` | Admin | Start payment |
| POST | `/saas/billing/stripe-verify` | Admin | Verify Stripe payment |
| GET | `/saas/plans` | All | List plans + features |

### Stripe Flow
```
1. POST /saas/billing/initiate  →  returns checkout_url
2. window.location.href = checkout_url  →  Stripe hosted page
3. User pays on Stripe  →  redirects to /saas?stripe_session_id=xxx
4. Frontend auto-calls POST /saas/billing/stripe-verify
5. Plan upgraded automatically
```

### Frontend Pages
- `/saas` — SaaS management, plan upgrade, billing

---

## Phase 8 — SLA, Escalation & Enhanced Audit

### Features
- SLA rule definition per module + priority
- Automatic SLA tracking with breach detection
- Approval escalation to higher authority
- Approval delegation when manager is unavailable
- Per-user notification preferences
- Enhanced audit log with filtering

### New Database Tables (Phase 8)
| Table | Purpose |
|---|---|
| `sla_rules` | Time limits per module + priority |
| `sla_tracking` | Per-record SLA compliance |
| `approval_escalations` | Escalation records |
| `approval_delegations` | Delegation records |
| `notification_preferences` | User notification settings |

### Existing Tables Extended
| Table | New Fields |
|---|---|
| `tasks` | `sla_status`, `sla_due_time`, `is_sla_breached` |
| `approvals` | `sla_status`, `sla_due_time`, `is_escalated`, `current_escalation_to` |
| `notifications` | `notification_type`, `notif_priority` |
| `audit_logs` | `module_name`, `action_type`, `record_id`, `old_data`, `new_data`, `ip_address`, `user_agent` |

### SLA API Endpoints (11 endpoints)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/sla-rules` | Create SLA rule |
| GET | `/sla-rules` | List SLA rules |
| GET | `/sla-rules/{id}` | Get SLA rule |
| PUT | `/sla-rules/{id}` | Update SLA rule |
| DELETE | `/sla-rules/{id}` | Disable SLA rule |
| POST | `/sla-tracking/tasks/{task_id}` | Start SLA for task |
| POST | `/sla-tracking/approvals/{approval_id}` | Start SLA for approval |
| PUT | `/sla-tracking/{id}/complete` | Mark SLA complete |
| GET | `/sla-tracking/active` | List active SLA records |
| GET | `/sla-tracking/breached` | List breached records |
| GET | `/sla-tracking/record/{module}/{id}` | SLA for specific record |
| POST | `/sla-tracking/detect-breaches` | Auto-mark overdue as breached |

### Escalation API Endpoints (6 endpoints)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/approval-escalations` | Escalate approval |
| GET | `/approval-escalations` | List escalations |
| GET | `/approval-escalations/pending` | Pending escalations |
| GET | `/approval-escalations/approval/{id}` | Escalation history |
| PUT | `/approval-escalations/{id}/resolve` | Resolve escalation |
| PUT | `/approval-escalations/{id}/cancel` | Cancel escalation |

### Delegation API Endpoints (4 endpoints)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/approval-delegations` | Create delegation |
| GET | `/approval-delegations/me` | My delegations |
| GET | `/approval-delegations/active` | Active delegations |
| PUT | `/approval-delegations/{id}/cancel` | Cancel delegation |

### Notification Preferences Endpoints (3 endpoints)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notification-preferences/me` | View preferences |
| PUT | `/notification-preferences/me` | Update preferences |
| POST | `/notification-preferences/default/{user_id}` | Create defaults |

### Enhanced Audit Endpoints (5 endpoints)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/audit-logs/enhanced` | All logs (paginated) |
| GET | `/audit-logs/{id}` | Single log detail |
| GET | `/audit-logs/module/{name}` | Filter by module |
| GET | `/audit-logs/user/{user_id}` | Filter by user |
| GET | `/audit-logs/date-range` | Filter by date range |

### SLA How It Works
```
SLA Due Time = Time "Start SLA" clicked + Allowed Hours from SLA Rule

Example:
  SLA Rule: Task / High / 24h
  Start SLA clicked at: 10:00 AM
  SLA Due Time: next day 10:00 AM

  ✅ Task completed by 9:00 AM → Completed Within SLA
  🔴 Task not done by 10:00 AM → Breached
```

---

## Phase 9 — Frontend Phase 8 UI

### New Pages
| Page | Route | Access |
|---|---|---|
| SLA Rules | `/admin/sla-rules` | Admin only |
| SLA Dashboard | `/dashboard/sla` | Admin + Manager |
| Approval Escalations | `/approval-escalations` | Admin + Manager |
| Approval Delegations | `/approval-delegations` | Admin + Manager |
| Notification Preferences | `/settings/notification-preferences` | All roles |
| Enhanced Audit Logs | `/admin/audit-logs` | Admin only |

### Updated Existing Pages
| Page | Phase 8 Changes |
|---|---|
| Dashboard (`/dashboard`) | SLA Status column + `▶ Start SLA` + `↺ Restart` buttons + breach alert banner |
| Edit Task (`/tasks/edit/:id`) | SLA panel: status badge, due time, breach warning (red), remaining time (blue), Start/Restart button |
| Approvals (`/approvals`) | Table columns: SLA Status / SLA Due Time / Escalated / Escalated To + detail panel with escalate button + in-page escalate modal |
| Kanban Board (`/kanban`) | SLA badge on every card (🔵 Active / 🔴 Breached / ✅ Done) |

### Reusable Components
| Component | File | Purpose |
|---|---|---|
| `StatusBadge` | StatusBadge.jsx | Generic status coloured badge |
| `SLABadge` | StatusBadge.jsx | SLA-specific badge (Active/Breached/Completed) |
| `ConfirmModal` | ConfirmModal.jsx | Reusable confirm dialog |
| `FilterBar` | FilterBar.jsx | Filter row container |
| `FilterSelect` | FilterBar.jsx | Dropdown filter |
| `FilterInput` | FilterBar.jsx | Text filter |
| `PageHeader` | PageHeader.jsx | Consistent page header with action slot |
| `LoadingSpinner` | LoadingSpinner.jsx | Loading state |
| `EmptyState` | LoadingSpinner.jsx | Empty data state |
| `ErrorMessage` | LoadingSpinner.jsx | Error display |
| `ToggleSwitch` | ToggleSwitch.jsx | Boolean toggle input |

### Badge Colour Spec
| Status | Badge |
|---|---|
| ACTIVE | 🔵 Blue (`#dbeafe` / `#1d4ed8`) |
| COMPLETED_WITHIN_SLA | ✅ Green (`#dcfce7` / `#166534`) |
| BREACHED | 🔴 Red (`#fee2e2` / `#dc2626`) |
| ESCALATED | 🟠 Orange (`#fed7aa` / `#c2410c`) |

### Role-Based Sidebar
| Menu Item | Admin | Manager | Employee |
|---|---|---|---|
| SLA Dashboard | ✅ | ✅ | ❌ |
| SLA Rules | ✅ | ❌ | ❌ |
| Escalations | ✅ | ✅ | ❌ |
| Delegations | ✅ | ✅ | ❌ |
| Notification Prefs | ✅ | ✅ | ✅ |
| Audit Logs (Enhanced) | ✅ | ❌ | ❌ |

---

*Built with FastAPI + React | SQLAlchemy 2.0 | Phase 1-9 Complete*
