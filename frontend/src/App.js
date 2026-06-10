// src/App.js — Phase 1–8 complete
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Phase 1-3
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import Dashboard     from "./pages/Dashboard";
import CreateTask    from "./pages/CreateTask";
import EditTask      from "./pages/EditTask";
import AllUsers      from "./pages/AllUsers";
import KanbanBoard   from "./pages/KanbanBoard";
import Approvals     from "./pages/Approvals";
import TaskComments  from "./pages/TaskComments";
import TeamProgress  from "./pages/TeamProgress";
import Documents     from "./pages/Documents";
import AuditLogs     from "./pages/AuditLogs";
import Notifications from "./pages/Notifications";
import AISummary     from "./pages/AISummary";

// Phase 4
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";

// Phase 5
import RoleDashboard from "./pages/RoleDashboard";

// Phase 6
import AIInsights from "./pages/AIInsights";

// Phase 7
import SaaS from "./pages/SaaS";

// Phase 10A
import Tenants          from "./pages/Tenants";
import TenantOnboarding from "./pages/TenantOnboarding";
import Workspaces       from "./pages/Workspaces";
import Channels         from "./pages/Channels";
import SuperAdmin       from "./pages/SuperAdmin";

// Phase 8
import SLARules                from "./pages/SLARules";
import SLADashboard            from "./pages/SLADashboard";
import ApprovalEscalations     from "./pages/ApprovalEscalations";
import ApprovalDelegations     from "./pages/ApprovalDelegations";
import NotificationPreferences from "./pages/NotificationPreferences";
import EnhancedAuditLogs       from "./pages/EnhancedAuditLogs";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Phase 1-3 */}
          <Route path="/dashboard"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tasks/create"       element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
          <Route path="/tasks/edit/:id"     element={<ProtectedRoute><EditTask /></ProtectedRoute>} />
          <Route path="/tasks/:id/comments" element={<ProtectedRoute><TaskComments /></ProtectedRoute>} />
          <Route path="/users"              element={<ProtectedRoute><AllUsers /></ProtectedRoute>} />
          <Route path="/kanban"             element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
          <Route path="/approvals"          element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
          <Route path="/team-progress"      element={<ProtectedRoute><TeamProgress /></ProtectedRoute>} />
          <Route path="/documents"          element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/audit-logs"         element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
          <Route path="/notifications"      element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/ai-summary"         element={<ProtectedRoute><AISummary /></ProtectedRoute>} />

          {/* Phase 4 */}
          <Route path="/change-password"    element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

          {/* Phase 5 */}
          <Route path="/role-dashboard"     element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />

          {/* Phase 6 */}
          <Route path="/ai-insights"        element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />

          {/* Phase 7 */}
          <Route path="/saas"               element={<ProtectedRoute><SaaS /></ProtectedRoute>} />

          {/* Phase 8 */}
          <Route path="/admin/sla-rules"              element={<ProtectedRoute><SLARules /></ProtectedRoute>} />
          <Route path="/dashboard/sla"                element={<ProtectedRoute><SLADashboard /></ProtectedRoute>} />
          <Route path="/approval-escalations"         element={<ProtectedRoute><ApprovalEscalations /></ProtectedRoute>} />
          <Route path="/approval-delegations"         element={<ProtectedRoute><ApprovalDelegations /></ProtectedRoute>} />
          <Route path="/settings/notification-preferences" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
          <Route path="/admin/audit-logs"             element={<ProtectedRoute><EnhancedAuditLogs /></ProtectedRoute>} />

          {/* Phase 10A */}
          <Route path="/tenants"              element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
          <Route path="/tenants/onboarding"   element={<ProtectedRoute><TenantOnboarding /></ProtectedRoute>} />
          <Route path="/workspaces"           element={<ProtectedRoute><Workspaces /></ProtectedRoute>} />
          <Route path="/channels"             element={<ProtectedRoute><Channels /></ProtectedRoute>} />
          <Route path="/super-admin"            element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
