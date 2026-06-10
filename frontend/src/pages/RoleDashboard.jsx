// src/pages/RoleDashboard.jsx — Phase 5: Role-based dashboard
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",{ day:"numeric",month:"short",year:"numeric" }) : "—";

function EmployeeView({ data }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Assigned Tasks",    value:data.assigned_tasks.length,color:"#4361ee" },
          { label:"Completion Rate",   value:`${data.completion_rate}%`,color:"#16a34a" },
          { label:"Pending Requests",  value:data.pending_requests,      color:"#f59e0b" },
          { label:"Unread Notifs",     value:data.my_notifications,      color:"#7c3aed" },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold" style={{color:s.color}}>{s.value}</p>
            <p className="text-xs mt-1" style={{color:"var(--muted)"}}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(data.task_breakdown).map(([status,count])=>(
          <div key={status} className="card text-center">
            <p className="text-xl font-bold">{count}</p>
            <p className="text-xs capitalize mt-1" style={{color:"var(--muted)"}}>{status.replace("_"," ")}</p>
          </div>
        ))}
      </div>
      <div className="card !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold text-sm" style={{borderColor:"var(--border)"}}>My Tasks</div>
        <table className="w-full text-sm">
          <thead style={{background:"var(--surface)"}}>
            <tr>{["Title","Status","Priority","Due"].map(h=>(
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{color:"var(--muted)"}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {data.assigned_tasks.map(t=>(
              <tr key={t.id} className="border-t hover:bg-slate-50 cursor-pointer" style={{borderColor:"var(--border)"}}
                  onClick={() => navigate(`/tasks/edit/${t.id}`)}>
                <td className="px-5 py-3 font-medium">{t.title}</td>
                <td className="px-5 py-3"><span className={`badge-${t.status}`}>{t.status.replace("_"," ")}</span></td>
                <td className="px-5 py-3"><span className={`badge-${t.priority}`}>{t.priority}</span></td>
                <td className="px-5 py-3 text-xs" style={{color:"var(--muted)"}}>{fmt(t.due_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManagerView({ data }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Team Tasks",     value:data.team_tasks.length,   color:"#4361ee" },
          { label:"Team Members",   value:data.team_members,        color:"#2563eb" },
          { label:"Pending Approvals",value:data.pending_approvals, color:"#f59e0b" },
          { label:"Overdue Tasks",  value:data.overdue_tasks,       color:"#dc2626" },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold" style={{color:s.color}}>{s.value}</p>
            <p className="text-xs mt-1" style={{color:"var(--muted)"}}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">Approval Summary</h3>
          {Object.entries(data.approval_summary).map(([k,v])=>(
            <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0" style={{borderColor:"var(--border)"}}>
              <span className="capitalize">{k}</span><span className="font-bold">{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">Team Completion</h3>
          <p className="text-4xl font-bold mb-2" style={{color:"#16a34a"}}>{data.team_completion}%</p>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full" style={{width:`${data.team_completion}%`,background:"#16a34a"}} />
          </div>
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
        {data.recent_activity.slice(0,5).map((a,i)=>(
          <div key={i} className="text-xs py-1.5 border-b last:border-0 font-mono" style={{color:"var(--muted)",borderColor:"var(--border)"}}>
            {new Date(a.timestamp).toLocaleString("en-IN",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"})} —{" "}
            {a.actor?.name} {a.action.replace("_"," ")} {a.entity_type} {a.entity_name && `"${a.entity_name}"`}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminView({ data }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Total Users",    value:data.total_users,    color:"#4361ee" },
          { label:"Total Tasks",    value:data.total_tasks,    color:"#2563eb" },
          { label:"Total Approvals",value:data.total_approvals,color:"#7c3aed" },
          { label:"Documents",      value:data.total_documents, color:"#f59e0b" },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold" style={{color:s.color}}>{s.value}</p>
            <p className="text-xs mt-1" style={{color:"var(--muted)"}}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-semibold text-sm mb-3">User Breakdown</h3>
          {Object.entries(data.user_breakdown).map(([k,v])=>(
            <div key={k} className="flex justify-between text-sm py-1.5 border-b last:border-0 capitalize" style={{borderColor:"var(--border)"}}>
              <span>{k}</span><span className="font-bold">{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="font-semibold text-sm mb-3">Task Status</h3>
          {Object.entries(data.task_status_dist).map(([k,v])=>(
            <div key={k} className="flex justify-between text-sm py-1.5 border-b last:border-0 capitalize" style={{borderColor:"var(--border)"}}>
              <span>{k.replace("_"," ")}</span><span className="font-bold">{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="font-semibold text-sm mb-3">System Health</h3>
          <div className="flex justify-between text-sm py-1.5 border-b" style={{borderColor:"var(--border)"}}>
            <span>DB Status</span><span className="text-green-600 font-bold">{data.system_health.db_status}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-b" style={{borderColor:"var(--border)"}}>
            <span>Active WS</span><span className="font-bold">{data.active_ws_sessions}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5" style={{borderColor:"var(--border)"}}>
            <span>Cache Keys</span><span className="font-bold">{data.system_health.cache_stats?.valid_keys ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoleDashboard() {
  const { user }  = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!user) return;
    const endpoint =
      user.role === "admin"   ? "/role-dashboard/admin"    :
      user.role === "manager" ? "/role-dashboard/manager"  :
                                "/role-dashboard/employee";
    api.get(endpoint)
       .then(r => setData(r.data))
       .catch(() => setError("Failed to load dashboard."))
       .finally(() => setLoading(false));
  }, [user]);

  return (
    <Layout>
      <div className="fade-up max-w-6xl">
        <div className="mb-8">
          <h2 className="font-display text-3xl">
            {user?.role === "admin"   && "Admin Analytics Dashboard"}
            {user?.role === "manager" && "Manager Dashboard"}
            {user?.role === "employee" && "My Dashboard"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Role-specific view — {user?.role}
          </p>
        </div>
        {loading && <p className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}
        {error   && <p className="text-sm text-red-500">{error}</p>}
        {data && user?.role === "employee" && <EmployeeView data={data} />}
        {data && user?.role === "manager"  && <ManagerView  data={data} />}
        {data && user?.role === "admin"    && <AdminView    data={data} />}
      </div>
    </Layout>
  );
}
