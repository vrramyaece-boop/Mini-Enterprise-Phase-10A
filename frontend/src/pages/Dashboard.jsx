// src/pages/Dashboard.jsx — Phase 1-8
// Shows task list with Phase 8 SLA badges, stat cards, AI summary, notifications

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { SLABadge } from "../components/StatusBadge";

const statusBadge   = (s) => `badge-${s}`;
const priorityBadge = (p) => `badge-${p}`;
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",
  { day: "numeric", month: "short", year: "numeric" }) : "—";

// SLA remaining time helper — Phase 8
function SLARemaining({ slaStatus, slaDueTime, isBreached }) {
  if (!slaDueTime && !slaStatus)
    return <span className="text-xs" style={{color:"var(--muted)"}}>—</span>;

  // Explicitly breached from DB
  if (isBreached || slaStatus === "breached")
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{background:"#fee2e2",color:"#dc2626"}}>
        🔴 Breached
      </span>
    );

  // Completed on time
  if (slaStatus === "completed")
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{background:"#dcfce7",color:"#166534"}}>
        ✅ Completed
      </span>
    );

  // Calculate remaining time from due_time
  if (slaDueTime) {
    const diff = new Date(slaDueTime) - new Date();

    // Past due but sla_status not yet updated to breached
    if (diff <= 0) {
      const hoursAgo = Math.abs(Math.floor(diff / 3600000));
      const minsAgo  = Math.abs(Math.floor((diff % 3600000) / 60000));
      return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{background:"#fee2e2",color:"#dc2626"}}
              title={`SLA deadline passed ${hoursAgo}h ${minsAgo}m ago`}>
          🔴 {hoursAgo > 0 ? `${hoursAgo}h overdue` : `${minsAgo}m overdue`}
        </span>
      );
    }

    // Still within SLA
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const isWarning = diff < 2 * 3600000; // warn if < 2h left

    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{background: isWarning ? "#fef3c7" : "#dbeafe",
                    color:      isWarning ? "#92400e" : "#1d4ed8"}}>
        {isWarning ? "⚠️" : "🔵"} {h}h {m}m left
      </span>
    );
  }

  // Fallback: just show status badge
  return (
    <span className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{background:"#f3f4f6",color:"#6b7280"}}>
      {slaStatus}
    </span>
  );
}

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [tasks,    setTasks]    = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [dist,     setDist]     = useState([]);
  const [insights, setInsights] = useState(null);
  const [aiData,   setAiData]   = useState(null);
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tasksRes, summaryRes, distRes, insightsRes, aiRes, notifsRes] =
          await Promise.all([
            api.get("/tasks/"),
            api.get("/dashboard/summary"),
            api.get("/dashboard/task-distribution"),
            api.get("/dashboard/performance-insights"),
            api.get("/dashboard/ai-summary"),
            api.get("/notifications/?unread_only=true"),
          ]);
        setTasks(tasksRes.data?.items || tasksRes.data || []);
        setSummary(summaryRes.data);
        setDist(distRes.data);
        setInsights(insightsRes.data);
        setAiData(aiRes.data);
        setNotifs((notifsRes.data?.items || notifsRes.data || []).slice(0, 5));
      } catch { setError("Failed to load dashboard."); }
      finally  { setLoading(false); }
    };
    fetchAll();
  }, []);

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) { alert(err.response?.data?.detail || "Delete failed"); }
  };

  // Phase 8: Start SLA tracking directly from dashboard task row
  const [slaLoading, setSlaLoading] = useState({});
  const handleStartSLA = async (task) => {
    setSlaLoading(p => ({...p, [task.id]: true}));
    try {
      await api.post(`/sla-tracking/tasks/${task.id}`);
      const { data } = await api.get("/tasks/");
      setTasks(data?.items || data || []);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to start SLA";
      if (msg.includes("No active SLA rule")) {
        alert(`❌ No SLA rule found for Task / ${task.priority} priority.

Go to SLA Rules → + New SLA Rule
Module: Task | Priority: ${task.priority} | Hours: 720`);
      } else if (msg.includes("already active")) {
        // SLA already running — try to restart by detecting breach first
        try {
          await api.post("/sla-tracking/detect-breaches");
          await api.post(`/sla-tracking/tasks/${task.id}`);
          const { data } = await api.get("/tasks/");
          setTasks(data?.items || data || []);
        } catch (e2) {
          alert(`❌ ${e2.response?.data?.detail || msg}`);
        }
      } else {
        alert(`❌ ${msg}`);
      }
    } finally {
      setSlaLoading(p => ({...p, [task.id]: false}));
    }
  };

  const stats   = summary || { total_tasks: tasks.length, todo:0, in_progress:0,
                                review:0, done:0, pending_approvals:0 };
  const maxCount = Math.max(...dist.map(d => d.count), 1);
  const barColor = { todo:"#6b7280", in_progress:"#2563eb", review:"#7c3aed", done:"#16a34a" };

  // Phase 8 SLA breach alert
  const breachedTasks = tasks.filter(t => t.is_sla_breached);

  return (
    <Layout>
      <div className="fade-up max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">Dashboard</h2>
            <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
              {user?.role==="admin" ? "Full system overview" :
               user?.role==="manager" ? "Tasks you manage" : "Your assigned tasks"}
            </p>
          </div>
          {user?.role !== "employee" && (
            <button className="btn-primary !w-auto px-5" onClick={()=>navigate("/tasks/create")}>
              + New Task
            </button>
          )}
        </div>

        {/* Phase 8: SLA breach alert banner */}
        {breachedTasks.length > 0 && (
          <div className="mb-5 p-4 rounded-xl border flex items-center justify-between"
               style={{background:"#fff5f5",borderColor:"#fca5a5"}}>
            <p className="text-sm font-semibold text-red-700">
              🔴 {breachedTasks.length} task(s) have breached their SLA deadline!
            </p>
            <button onClick={()=>navigate("/dashboard/sla")}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-red-700 bg-red-100">
              View SLA Dashboard →
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-6 md:grid-cols-6">
          {[
            {label:"Total",             value:stats.total_tasks,       color:"#4361ee"},
            {label:"To Do",             value:stats.todo,              color:"#6b7280"},
            {label:"In Progress",       value:stats.in_progress,       color:"#2563eb"},
            {label:"Review",            value:stats.review,            color:"#7c3aed"},
            {label:"Done",              value:stats.done,              color:"#16a34a"},
            {label:"Pending Approvals", value:stats.pending_approvals, color:"#f59e0b"},
          ].map(s=>(
            <div key={s.label} className="card text-center">
              <p className="text-2xl font-bold" style={{color:s.color}}>{s.value}</p>
              <p className="text-xs mt-1" style={{color:"var(--muted)"}}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Summary banner */}
        {aiData && (
          <div className="card mb-6"
               style={{background:"linear-gradient(135deg,#eff6ff,#f5f3ff)",borderColor:"#c7d2fe"}}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase mb-1" style={{color:"var(--muted)",letterSpacing:".05em"}}>
                  🤖 AI Insights
                </p>
                <p className="font-semibold text-base mb-3">{aiData.summary_text}</p>
                <div className="flex flex-col gap-1.5">
                  {aiData.insights.slice(0,3).map((ins,i)=>(
                    <p key={i} className="text-sm" style={{color:"#374151"}}>{ins}</p>
                  ))}
                </div>
              </div>
              <button onClick={()=>navigate("/ai-summary")}
                      className="btn-secondary !w-auto px-3 text-xs ml-4 shrink-0">
                Full Insights →
              </button>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {dist.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-sm mb-4">📊 Task Distribution</h3>
              <div className="flex flex-col gap-3">
                {dist.map(d=>(
                  <div key={d.status} className="flex items-center gap-3">
                    <span className="text-xs w-24 capitalize text-right" style={{color:"var(--muted)"}}>
                      {d.status.replace("_"," ")}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                           style={{width:`${(d.count/maxCount)*100}%`,background:barColor[d.status]||"#6b7280"}} />
                    </div>
                    <span className="text-xs font-semibold w-6 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {insights && user?.role === "admin" && (
            <div className="card">
              <h3 className="font-semibold text-sm mb-4">📈 Performance Insights</h3>
              <div className="flex flex-col gap-3">
                {[
                  {label:"Completion Rate",value:`${insights.completion_rate}%`,   bg:"#f0fdf4",color:"#16a34a"},
                  {label:"In Review",      value:`${insights.in_review_rate}%`,    bg:"#f5f3ff",color:"#7c3aed"},
                  {label:"Overdue Tasks",  value:insights.overdue_tasks,            bg:insights.overdue_tasks>0?"#fef2f2":"#f9fafb",color:insights.overdue_tasks>0?"#dc2626":"#6b7280"},
                  {label:"Avg Comments",   value:insights.avg_comments_per_task,   bg:"#eff6ff",color:"#2563eb"},
                ].map(s=>(
                  <div key={s.label} className="flex items-center justify-between p-2 rounded-lg"
                       style={{background:s.bg}}>
                    <p className="text-xs font-medium">{s.label}</p>
                    <p className="text-lg font-bold" style={{color:s.color}}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications + Activity */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">🔔 Notifications</h3>
              <button onClick={()=>navigate("/notifications")} className="text-xs" style={{color:"var(--brand)"}}>View all →</button>
            </div>
            {notifs.length===0 ? (
              <p className="text-xs py-4 text-center" style={{color:"var(--muted)"}}>No unread notifications</p>
            ) : (
              <div className="flex flex-col gap-2">
                {notifs.map(n=>(
                  <div key={n.id} className="text-xs p-2 rounded-lg" style={{background:"var(--surface)"}}>
                    <p className="leading-snug">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">📰 Activity Feed</h3>
              {user?.role==="admin" && (
                <button onClick={()=>navigate("/audit-logs")} className="text-xs" style={{color:"var(--brand)"}}>Full logs →</button>
              )}
            </div>
            {aiData?.activity_feed?.length>0 ? (
              <div className="flex flex-col gap-1.5">
                {aiData.activity_feed.slice(0,6).map((item,i)=>(
                  <p key={i} className="text-xs py-1 border-b last:border-0 font-mono leading-snug"
                     style={{color:"var(--muted)",borderColor:"var(--border)"}}>
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-4" style={{color:"var(--muted)"}}>No recent activity</p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            {label:"🗂 Kanban",      path:"/kanban",           desc:"Drag & drop workflow"},
            {label:"✅ Approvals",   path:"/approvals",        desc:"Submit or review requests"},
            {label:"⏱ SLA Monitor", path:"/dashboard/sla",   desc:"Track SLA compliance"},
            {label:"🤖 AI Insights", path:"/ai-summary",       desc:"Smart task analysis"},
          ].map(l=>(
            <button key={l.path} onClick={()=>navigate(l.path)}
                    className="card text-left hover:shadow-md transition-shadow cursor-pointer">
              <p className="font-semibold text-sm">{l.label}</p>
              <p className="text-xs mt-1" style={{color:"var(--muted)"}}>{l.desc}</p>
            </button>
          ))}
        </div>

        {/* Task table with Phase 8 SLA column */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b" style={{borderColor:"var(--border)"}}>
            <h3 className="font-semibold text-sm">Task List</h3>
          </div>
          {loading && <p className="text-center py-12 text-sm" style={{color:"var(--muted)"}}>Loading…</p>}
          {error   && <p className="text-center py-12 text-sm text-red-500">{error}</p>}
          {!loading && tasks.length===0 && (
            <p className="text-center py-12 text-sm" style={{color:"var(--muted)"}}>No tasks found.</p>
          )}
          {!loading && tasks.length>0 && (
            <table className="w-full text-sm">
              <thead style={{background:"var(--surface)"}}>
                <tr>
                  {["Title","Status","Priority","Due Date","SLA Status","Actions"].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                        style={{color:"var(--muted)"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(task=>(
                  <tr key={task.id}
                      className="border-t hover:bg-slate-50"
                      style={{borderColor:"var(--border)",
                              background:task.is_sla_breached?"#fff5f5":undefined}}>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{task.title}</td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(task.status)}>
                        {task.status.replace("_"," ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={priorityBadge(task.priority)}>{task.priority}</span>
                    </td>
                    <td className="px-4 py-3" style={{color:"var(--muted)"}}>{fmt(task.due_date)}</td>
                    {/* Phase 8: SLA Status column */}
                    <td className="px-4 py-3">
                      {task.sla_status ? (
                        <div className="flex flex-col gap-1">
                          <SLARemaining
                            slaStatus={task.sla_status}
                            slaDueTime={task.sla_due_time}
                            isBreached={task.is_sla_breached}
                          />
                          {/* Restart button if overdue */}
                          {user?.role !== "employee" &&
                           task.sla_due_time &&
                           new Date(task.sla_due_time) < new Date() && (
                            <button
                              onClick={() => handleStartSLA(task)}
                              disabled={slaLoading[task.id]}
                              className="text-xs px-2 py-0.5 rounded font-medium"
                              style={{background:"#dbeafe",color:"#1d4ed8",fontSize:"10px"}}
                              title="Restart SLA with current rule">
                              {slaLoading[task.id] ? "…" : "↺ Restart"}
                            </button>
                          )}
                        </div>
                      ) : (
                        user?.role !== "employee" ? (
                          <button
                            onClick={() => handleStartSLA(task)}
                            disabled={slaLoading[task.id]}
                            className="text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap"
                            style={{background:"var(--brand)",color:"#fff",opacity:slaLoading[task.id]?0.6:1}}
                            title="Click to start SLA time tracking for this task"
                          >
                            {slaLoading[task.id] ? "Starting…" : "▶ Start SLA"}
                          </button>
                        ) : (
                          <span className="text-xs" style={{color:"var(--muted)"}}>—</span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={()=>navigate(`/tasks/edit/${task.id}`)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                                style={{background:"var(--brand-50)",color:"var(--brand)"}}>
                          Edit
                        </button>
                        <button onClick={()=>navigate(`/tasks/${task.id}/comments`)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                                style={{background:"#f0fdf4",color:"#166534"}}>
                          💬 Comments
                        </button>
                        {user?.role!=="employee" && (
                          <button onClick={()=>handleDelete(task.id)}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
