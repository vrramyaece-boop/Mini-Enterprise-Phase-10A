// src/components/Sidebar.jsx — All Phases (1-8) with role-based menu visibility
// Phase 8 menu:
//   SLA Dashboard        → Admin ✅  Manager ✅  Employee ❌
//   SLA Rules            → Admin ✅  Manager ❌  Employee ❌
//   Approval Escalations → Admin ✅  Manager ✅  Employee ❌
//   Approval Delegations → Admin ✅  Manager ✅  Employee ❌
//   Notification Prefs   → Admin ✅  Manager ✅  Employee ✅
//   Audit Logs (Enhanced)→ Admin ✅  Manager ❌  Employee ❌

import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import useWebSocket from "../hooks/useWebSocket";

const Icon = ({ path }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  add:       "M12 4v16m8-8H4",
  kanban:    "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
  approval:  "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  team:      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  doc:       "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  bell:      "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  audit:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  ai:        "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  users:     "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  lock:      "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  chart:     "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  saas:      "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  logout:    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  // Phase 8 icons
  sla:       "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  escalate:  "M5 10l7-7m0 0l7 7m-7-7v18",
  delegate:  "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  settings:  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  // Phase 10A icons
  tenant:    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  workspace: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  channel:   "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
  onboard:   "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
};

function SectionLabel({ label }) {
  return (
    <div className="mx-2 mt-4 mb-1 text-xs font-bold uppercase"
         style={{color:"var(--muted)",letterSpacing:".08em"}}>
      {label}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsToast, setWsToast]         = useState(null);
  const token = localStorage.getItem("access_token");
  const { isConnected, lastEvent } = useWebSocket(user?.id, token);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.event === "notification") {
      setUnreadCount(c => c + 1);
      setWsToast(lastEvent.data?.message || "New notification");
      setTimeout(() => setWsToast(null), 4000);
    }
    if (lastEvent.event === "kanban_update") {
      setWsToast(`🗂 Kanban: "${lastEvent.data?.task_title}" moved to ${lastEvent.data?.new_status?.replace("_"," ")}`);
      setTimeout(() => setWsToast(null), 4000);
    }
  }, [lastEvent]);

  useEffect(() => {
    const fetch = () => api.get("/notifications/unread-count")
      .then(r => setUnreadCount(r.data.unread_count || 0)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  const lc = ({ isActive }) => "sidebar-link" + (isActive ? " active" : "");
  const isAdmin      = user?.role === "admin";
  const isManager    = user?.role === "manager";
  const isEmp        = user?.role === "employee";
  const isSuperAdmin = user?.is_super_admin === true;

  return (
    <aside className="w-60 min-h-screen bg-white flex flex-col py-6 px-3 relative"
           style={{ borderRight: "1px solid var(--border)" }}>

      {/* WS Toast */}
      {wsToast && (
        <div className="absolute top-2 left-2 right-2 z-50 p-2.5 rounded-xl text-xs font-medium shadow-lg fade-up"
             style={{ background: "var(--brand)", color: "#fff" }}>
          {wsToast}
        </div>
      )}

      {/* Logo */}
      <div className="px-3 mb-6 mt-2">
        <h1 className="font-display text-xl" style={{ color: "var(--brand)" }}>TaskFlow</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs" style={{ color: "var(--muted)" }}>Enterprise v10</p>
          <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: isConnected ? "#dcfce7" : "#fee2e2",
                         color: isConnected ? "#166534" : "#dc2626" }}>
            {isConnected ? "● Live" : "○ Off"}
          </span>
        </div>
      </div>

      {/* User info */}
      <div className="mx-2 mb-5 p-3 rounded-xl" style={{ background: "var(--surface)" }}>
        <p className="text-sm font-semibold truncate">{user?.name}</p>
        <span className="text-xs capitalize px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--brand)", color: "#fff" }}>
          {user?.is_super_admin ? "super admin" : user?.role}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">

        {/* ── Core ──────────────────────────────────────── */}
        <NavLink to="/dashboard"      className={lc}><Icon path={ICONS.dashboard}/> Dashboard</NavLink>
        <NavLink to="/role-dashboard" className={lc}><Icon path={ICONS.chart}/> My Dashboard</NavLink>
        {!isEmp && <NavLink to="/tasks/create" className={lc}><Icon path={ICONS.add}/> Create Task</NavLink>}
        <NavLink to="/kanban"         className={lc}><Icon path={ICONS.kanban}/> Kanban Board</NavLink>
        <NavLink to="/approvals"      className={lc}><Icon path={ICONS.approval}/> Approvals</NavLink>
        {(isAdmin || isManager) && (
          <NavLink to="/team-progress" className={lc}><Icon path={ICONS.team}/> Team Progress</NavLink>
        )}
        <NavLink to="/documents"      className={lc}><Icon path={ICONS.doc}/> Documents</NavLink>
        <NavLink to="/notifications"  className={lc}>
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-3"><Icon path={ICONS.bell}/> Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#dc2626", color: "#fff" }}>{unreadCount}</span>
            )}
          </div>
        </NavLink>
        <NavLink to="/ai-summary"     className={lc}><Icon path={ICONS.ai}/> AI Summary</NavLink>
        <NavLink to="/ai-insights"    className={lc}><Icon path={ICONS.ai}/> AI Insights</NavLink>

        {/* ── Phase 8: SLA & Workflow ───────────────────── */}
        <SectionLabel label="SLA & Workflow" />

        {/* SLA Dashboard — Admin + Manager */}
        {(isAdmin || isManager) && (
          <NavLink to="/dashboard/sla" className={lc}>
            <Icon path={ICONS.sla}/> SLA Dashboard
          </NavLink>
        )}

        {/* SLA Rules — Admin only */}
        {isAdmin && (
          <NavLink to="/admin/sla-rules" className={lc}>
            <Icon path={ICONS.sla}/> SLA Rules
          </NavLink>
        )}

        {/* Approval Escalations — Admin + Manager */}
        {(isAdmin || isManager) && (
          <NavLink to="/approval-escalations" className={lc}>
            <Icon path={ICONS.escalate}/> Escalations
          </NavLink>
        )}

        {/* Approval Delegations — Admin + Manager */}
        {(isAdmin || isManager) && (
          <NavLink to="/approval-delegations" className={lc}>
            <Icon path={ICONS.delegate}/> Delegations
          </NavLink>
        )}

        {/* ── Admin section ────────────────────────────── */}
        {isAdmin && (
          <>
            <SectionLabel label="Admin" />
            <NavLink to="/admin/audit-logs" className={lc}>
              <Icon path={ICONS.audit}/> Audit Logs
            </NavLink>
            <NavLink to="/audit-logs"  className={lc}><Icon path={ICONS.audit}/> Audit Logs (Basic)</NavLink>
            <NavLink to="/users"       className={lc}><Icon path={ICONS.users}/> All Users</NavLink>
            <NavLink to="/saas"        className={lc}><Icon path={ICONS.saas}/> SaaS & Billing</NavLink>
          </>
        )}

        {/* ── Phase 10A: Tenant & Collaboration ───────── */}
        {isAdmin && (
          <>
            <SectionLabel label="Tenant & Collaboration" />
            <NavLink to="/tenants"            className={lc}><Icon path={ICONS.tenant}/> Tenants</NavLink>
            <NavLink to="/tenants/onboarding" className={lc}><Icon path={ICONS.onboard}/> Onboarding</NavLink>
            <NavLink to="/workspaces"         className={lc}><Icon path={ICONS.workspace}/> Workspaces</NavLink>
            <NavLink to="/channels"           className={lc}><Icon path={ICONS.channel}/> Channels</NavLink>
          </>
        )}

        {/* ── Phase 10A: Super Admin Platform (super admins only) ── */}
        {isSuperAdmin && (
          <>
            <SectionLabel label="Super Admin" />
            <NavLink to="/super-admin" className={lc}>
              <Icon path={ICONS.tenant}/> Platform Control
            </NavLink>
          </>
        )}

        {/* ── Settings — all roles ─────────────────────── */}
        <SectionLabel label="Settings" />
        <NavLink to="/settings/notification-preferences" className={lc}>
          <Icon path={ICONS.settings}/> Notification Prefs
        </NavLink>
        <NavLink to="/change-password" className={lc}>
          <Icon path={ICONS.lock}/> Change Password
        </NavLink>
      </nav>

      <button onClick={logout} className="sidebar-link mt-4 mx-1">
        <Icon path={ICONS.logout}/> Logout
      </button>
    </aside>
  );
}
