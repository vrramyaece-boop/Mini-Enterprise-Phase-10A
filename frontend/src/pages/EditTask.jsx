// pages/EditTask.jsx — Phase 1-8 Spec Section 3
// New UI changes per spec:
//   ✅ SLA status badge in task detail
//   ✅ SLA due time display
//   ✅ Warning if SLA is breached (red banner)
//   ✅ Remaining time if SLA is active (blue countdown)
//   ✅ Start SLA Tracking button (admin/manager)
// Badge colors: Active=Blue / Completed=Green / Breached=Red / Escalated=Orange

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const fmt = (d) => d ? new Date(d).toLocaleString("en-IN",
  { day:"numeric", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit" }) : "—";

// Spec badge colours: Active=Blue / Completed=Green / Breached=Red / Escalated=Orange
function SLAStatusBadge({ slaStatus, isBreached, slaDueTime }) {
  if (isBreached || slaStatus === "breached")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
            style={{background:"#fee2e2",color:"#dc2626"}}>
        🔴 BREACHED
      </span>
    );
  if (slaStatus === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
            style={{background:"#dcfce7",color:"#166534"}}>
        ✅ COMPLETED
      </span>
    );
  if (slaStatus === "on_track" || slaStatus === "active") {
    if (slaDueTime && new Date(slaDueTime) < new Date())
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
              style={{background:"#fee2e2",color:"#dc2626"}}>
          🔴 BREACHED
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
            style={{background:"#dbeafe",color:"#1d4ed8"}}>
        🔵 ACTIVE
      </span>
    );
  }
  return null;
}

// Show remaining time or overdue time
function SLATimeRemaining({ slaDueTime }) {
  if (!slaDueTime) return null;
  const diff = new Date(slaDueTime) - new Date();
  if (diff <= 0) {
    const mins = Math.abs(Math.floor(diff / 60000));
    const h = Math.floor(mins / 60); const m = mins % 60;
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{background:"#fee2e2",color:"#dc2626"}}>
          ⏰ {h > 0 ? `${h}h ${m}m` : `${m}m`} overdue
        </span>
      </div>
    );
  }
  const mins = Math.floor(diff / 60000);
  const h = Math.floor(mins / 60); const m = mins % 60;
  const warn = diff < 2 * 3600000;
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs font-semibold px-2 py-1 rounded-lg"
            style={{background:warn?"#fef3c7":"#dbeafe",
                    color:warn?"#92400e":"#1d4ed8"}}>
        {warn ? "⚠️" : "⏱"} {h > 0 ? `${h}h ${m}m` : `${m}m`} remaining
      </span>
    </div>
  );
}

export default function EditTask() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:"", description:"", status:"todo", priority:"medium", due_date:""
  });
  const [taskData,       setTaskData]       = useState(null);
  const [assignUserId,   setAssignUserId]   = useState("");
  const [users,          setUsers]          = useState([]);
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [statusHistory,  setStatusHistory]  = useState([]);
  const [startingSLA,    setStartingSLA]    = useState(false);
  const [slaMsg,         setSlaMsg]         = useState("");

  const loadTask = async () => {
    try {
      const { data } = await api.get(`/tasks/${id}`);
      setTaskData(data);
      setForm({
        title:       data.title       || "",
        description: data.description || "",
        status:      data.status      || "todo",
        priority:    data.priority    || "medium",
        due_date:    data.due_date ? data.due_date.split("T")[0] : "",
      });
      setAssignUserId(data.assigned_to_id || "");
      if (user?.role === "admin") {
        const { data: usersData } = await api.get("/users/");
        setUsers(usersData);
      }
      try {
        const { data: hist } = await api.get(`/tasks/${id}/status-history`);
        setStatusHistory(hist);
      } catch { setStatusHistory([]); }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load task.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTask(); }, [id]);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleUpdate = async (e) => {
    e.preventDefault(); setError(""); setSaving(true);
    try {
      const payload = {
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null
      };
      await api.put(`/tasks/${id}`, payload);
      navigate("/dashboard");
    } catch (err) { setError(err.response?.data?.detail || "Update failed."); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignUserId) return;
    try {
      await api.patch(`/tasks/${id}/assign`, { assigned_to_id: parseInt(assignUserId) });
      alert("Task assigned successfully!");
    } catch (err) { alert(err.response?.data?.detail || "Assign failed."); }
  };

  const handleStartSLA = async () => {
    setStartingSLA(true); setSlaMsg("");
    try {
      const { data } = await api.post(`/sla-tracking/tasks/${id}`);
      setSlaMsg(`✅ SLA tracking started! Due: ${fmt(data.due_time)}`);
      await loadTask();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to start SLA tracking";
      if (msg.includes("No active SLA rule")) {
        setSlaMsg(`❌ No SLA rule for Task/${taskData?.priority}. Create one at SLA Rules page.`);
      } else if (msg.includes("already active")) {
        // Try restart — detect breach first then restart
        try {
          await api.post("/sla-tracking/detect-breaches");
          const { data } = await api.post(`/sla-tracking/tasks/${id}`);
          setSlaMsg(`✅ SLA restarted! Due: ${fmt(data.due_time)}`);
          await loadTask();
        } catch (e2) {
          setSlaMsg(`❌ ${e2.response?.data?.detail || msg}`);
        }
      } else {
        setSlaMsg(`❌ ${msg}`);
      }
    } finally { setStartingSLA(false); }
  };

  const fmtDt = (d) => d ? new Date(d).toLocaleString("en-IN",
    { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "";

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
             style={{borderColor:"var(--brand)",borderTopColor:"transparent"}} />
      </div>
    </Layout>
  );

  const isBreachedOrOverdue = taskData?.is_sla_breached ||
    (taskData?.sla_due_time && new Date(taskData.sla_due_time) < new Date());

  return (
    <Layout>
      <div className="fade-up max-w-2xl">

        {/* Back + Title */}
        <div className="mb-6">
          <button onClick={() => navigate("/dashboard")}
                  className="text-sm mb-3 flex items-center gap-1"
                  style={{color:"var(--muted)"}}>
            ← Back to Dashboard
          </button>
          <h2 className="font-display text-3xl">Edit Task</h2>
          <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
            #{id} · {taskData?.title}
          </p>
        </div>

        {/* ══ Phase 8 Spec Section 3: SLA Status Panel ══════════════ */}
        {taskData && user?.role !== "employee" && (
          <div className={`card mb-5 ${isBreachedOrOverdue ? "border-2 border-red-300" : ""}`}
               style={{background: isBreachedOrOverdue ? "#fff5f5" : undefined}}>

            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">⏱ SLA Status</h3>
              <SLAStatusBadge
                slaStatus={taskData.sla_status}
                isBreached={taskData.is_sla_breached}
                slaDueTime={taskData.sla_due_time} />
            </div>

            {/* Spec: Show warning if SLA is breached */}
            {isBreachedOrOverdue && (
              <div className="mb-3 p-3 rounded-xl flex items-center gap-2"
                   style={{background:"#fef2f2",border:"1px solid #fca5a5"}}>
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-xs font-bold text-red-700">SLA Breach Warning</p>
                  <p className="text-xs text-red-600">
                    This task has exceeded its SLA deadline.
                    Immediate attention required.
                  </p>
                </div>
              </div>
            )}

            {/* SLA fields grid */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div className="p-2.5 rounded-lg" style={{background:"var(--surface)"}}>
                <p style={{color:"var(--muted)"}}>SLA Status</p>
                <p className="font-semibold capitalize mt-0.5">
                  {taskData.sla_status || "Not tracked"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg" style={{background:"var(--surface)"}}>
                <p style={{color:"var(--muted)"}}>SLA Due Time</p>
                <p className="font-semibold mt-0.5">
                  {taskData.sla_due_time ? fmt(taskData.sla_due_time) : "—"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg" style={{background:"var(--surface)"}}>
                <p style={{color:"var(--muted)"}}>Is SLA Breached</p>
                <p className={`font-semibold mt-0.5 ${isBreachedOrOverdue?"text-red-600":"text-green-600"}`}>
                  {isBreachedOrOverdue ? "Yes" : "No"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg" style={{background:"var(--surface)"}}>
                <p style={{color:"var(--muted)"}}>Task Priority</p>
                <p className="font-semibold capitalize mt-0.5">{taskData.priority}</p>
              </div>
            </div>

            {/* Spec: Show remaining time if SLA is active */}
            {taskData.sla_due_time && (
              <SLATimeRemaining slaDueTime={taskData.sla_due_time} />
            )}

            {/* Start / Restart SLA button */}
            <div className="mt-3 pt-3 border-t" style={{borderColor:"var(--border)"}}>
              {!taskData.sla_status ? (
                <>
                  <button onClick={handleStartSLA} disabled={startingSLA}
                          className="text-xs px-4 py-2 rounded-lg font-medium"
                          style={{background:"var(--brand)",color:"#fff"}}>
                    {startingSLA ? "Starting…" : "▶ Start SLA Tracking"}
                  </button>
                  <p className="text-xs mt-1.5" style={{color:"var(--muted)"}}>
                    Begins time tracking based on the SLA rule for Task / {taskData.priority} priority
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium text-green-600">✅ SLA tracking active</p>
                  <button onClick={handleStartSLA} disabled={startingSLA}
                          className="text-xs px-3 py-1 rounded font-medium"
                          style={{background:"#dbeafe",color:"#1d4ed8"}}>
                    {startingSLA ? "…" : "↺ Restart SLA"}
                  </button>
                </div>
              )}
              {slaMsg && (
                <p className={`text-xs mt-2 font-medium ${
                  slaMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                  {slaMsg}
                </p>
              )}
            </div>
          </div>
        )}
        {/* ══ End SLA Panel ══════════════════════════════════════════ */}

        {/* Main edit form */}
        <div className="card">
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
              {error}
            </div>
          )}
          <form onSubmit={handleUpdate} className="flex flex-col gap-5">
            {user?.role !== "employee" && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1.5"
                         style={{color:"var(--muted)"}}>Task Title</label>
                  <input className="input-field" name="title"
                         value={form.title} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5"
                         style={{color:"var(--muted)"}}>Description</label>
                  <textarea className="input-field resize-none" name="description"
                            rows={3} value={form.description} onChange={handleChange} />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5"
                       style={{color:"var(--muted)"}}>Status</label>
                <select className="input-field" name="status"
                        value={form.status} onChange={handleChange}>
                  <option value="todo">📋 To Do</option>
                  <option value="in_progress">🔵 In Progress</option>
                  <option value="review">🟣 Review</option>
                  <option value="done">🟢 Done</option>
                </select>
              </div>
              {user?.role !== "employee" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5"
                         style={{color:"var(--muted)"}}>Priority</label>
                  <select className="input-field" name="priority"
                          value={form.priority} onChange={handleChange}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              )}
            </div>
            {user?.role !== "employee" && (
              <div>
                <label className="block text-xs font-medium mb-1.5"
                       style={{color:"var(--muted)"}}>Due Date</label>
                <input className="input-field" type="date" name="due_date"
                       value={form.due_date} onChange={handleChange} />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button className="btn-secondary" type="button"
                      onClick={() => navigate("/dashboard")}>
                Cancel
              </button>
            </div>
          </form>

          {/* Assign section */}
          {user?.role !== "employee" && (
            <div className="mt-6 pt-6 border-t" style={{borderColor:"var(--border)"}}>
              <h3 className="text-sm font-semibold mb-3">Assign Task</h3>
              <div className="flex gap-3">
                {user?.role === "admin" && users.length > 0 ? (
                  <select className="input-field" value={assignUserId}
                          onChange={e => setAssignUserId(e.target.value)}>
                    <option value="">— Select user —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="input-field" type="number"
                         placeholder="Enter user ID"
                         value={assignUserId}
                         onChange={e => setAssignUserId(e.target.value)} />
                )}
                <button onClick={handleAssign} type="button"
                        className="btn-primary !w-auto px-5 whitespace-nowrap">
                  Assign
                </button>
              </div>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t" style={{borderColor:"var(--border)"}}>
              <h3 className="text-sm font-semibold mb-3">🕓 Status History</h3>
              <div className="flex flex-col gap-2">
                {statusHistory.map(h => (
                  <div key={h.id}
                       className="flex items-center gap-3 text-xs p-2 rounded-lg"
                       style={{background:"var(--surface)"}}>
                    <span className="font-medium capitalize px-2 py-0.5 rounded-full"
                          style={{background:"#f3f4f6",color:"#374151"}}>
                      {h.from_status.replace("_"," ")}
                    </span>
                    <span style={{color:"var(--muted)"}}>→</span>
                    <span className="font-semibold capitalize px-2 py-0.5 rounded-full"
                          style={{background:"var(--brand-50)",color:"var(--brand)"}}>
                      {h.to_status.replace("_"," ")}
                    </span>
                    {h.changed_by_user?.name && (
                      <span style={{color:"var(--muted)"}}>
                        by <span className="font-medium">{h.changed_by_user.name}</span>
                      </span>
                    )}
                    <span className="ml-auto" style={{color:"var(--muted)"}}>
                      {fmtDt(h.changed_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
