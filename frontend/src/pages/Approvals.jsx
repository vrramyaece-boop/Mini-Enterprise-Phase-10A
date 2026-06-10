// pages/Approvals.jsx — Phase 2 + Phase 8 Spec Section 4
// New UI changes per spec:
//   ✅ SLA badge in list + detail
//   ✅ Escalation badge (is_escalated)
//   ✅ Current escalation user display
//   ✅ Escalation history button
//   ✅ Manual escalate button for Manager/Admin
// New table columns: SLA Status / SLA Due Time / Escalated / Escalated To

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",
  { day:"numeric", month:"short", year:"numeric" }) : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleString("en-IN",
  { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";

const statusStyle = {
  pending:  { background:"#fef3c7", color:"#92400e" },
  approved: { background:"#dcfce7", color:"#166534" },
  rejected: { background:"#fee2e2", color:"#dc2626" },
  on_hold:  { background:"#e0e7ff", color:"#4338ca" },
};

// Spec badge: Active=Blue / Completed=Green / Breached=Red / Escalated=Orange
function SLABadgeSpec({ slaStatus, slaDueTime }) {
  if (!slaStatus) return <span className="text-xs" style={{color:"var(--muted)"}}>—</span>;
  if (slaStatus === "breached" || (slaDueTime && new Date(slaDueTime) < new Date()))
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{background:"#fee2e2",color:"#dc2626"}}>🔴 Breached</span>
    );
  if (slaStatus === "completed")
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{background:"#dcfce7",color:"#166534"}}>✅ Completed</span>
    );
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{background:"#dbeafe",color:"#1d4ed8"}}>🔵 Active</span>
  );
}

function EscalatedBadge({ isEscalated }) {
  if (!isEscalated) return <span className="text-xs" style={{color:"var(--muted)"}}>No</span>;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{background:"#fed7aa",color:"#c2410c"}}>⬆ Yes</span>
  );
}

export default function Approvals() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [approvals,     setApprovals]     = useState([]);
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [selected,      setSelected]      = useState(null);
  const [history,       setHistory]       = useState([]);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState({ title:"", description:"" });
  const [submitting,    setSubmitting]    = useState(false);
  const [action,        setAction]        = useState("");
  const [actionComment, setActionComment] = useState("");
  const [acting,        setActing]        = useState(false);
  const [actionError,   setActionError]   = useState("");
  const [startingSLA,   setStartingSLA]   = useState(false);
  const [slaMsg,        setSlaMsg]        = useState("");
  const [showEscModal,  setShowEscModal]  = useState(false);
  const [escForm,       setEscForm]       = useState({ escalated_to:"", reason:"" });
  const [escalating,    setEscalating]    = useState(false);
  const [escMsg,        setEscMsg]        = useState("");

  const fetchApprovals = async () => {
    try {
      const { data } = await api.get("/approvals/");
      setApprovals(data);
    } catch { setError("Failed to load approvals."); }
    finally  { setLoading(false); }
  };

  useEffect(() => {
    fetchApprovals();
    api.get("/users/").then(r => setUsers(r.data || [])).catch(() => {});
  }, []);

  const fetchHistory = async (approvalId) => {
    try {
      const { data } = await api.get(`/approvals/${approvalId}/history`);
      setHistory(data);
    } catch { setHistory([]); }
  };

  const selectApproval = (a) => {
    setSelected(a); setAction(""); setActionComment("");
    setActionError(""); setSlaMsg(""); setEscMsg(""); fetchHistory(a.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post("/approvals/", form);
      setForm({ title:"", description:"" }); setShowForm(false); fetchApprovals();
    } catch (err) { setError(err.response?.data?.detail || "Submit failed."); }
    finally { setSubmitting(false); }
  };

  const handleAction = async () => {
    if (!action) return;
    if (action === "rejected" && !actionComment) {
      setActionError("A comment is required when rejecting."); return;
    }
    setActing(true); setActionError("");
    try {
      await api.patch(`/approvals/${selected.id}/action`, { action, comment:actionComment });
      fetchApprovals(); setSelected(null);
    } catch (err) { setActionError(err.response?.data?.detail || "Action failed."); }
    finally { setActing(false); }
  };

  const handleStartSLA = async () => {
    if (!selected) return;
    setStartingSLA(true); setSlaMsg("");
    try {
      const { data } = await api.post(`/sla-tracking/approvals/${selected.id}`);
      setSlaMsg(`✅ SLA started. Due: ${fmtFull(data.due_time)}`);
      fetchApprovals();
    } catch (err) {
      setSlaMsg(`❌ ${err.response?.data?.detail || "Failed to start SLA"}`);
    } finally { setStartingSLA(false); }
  };

  const handleEscalate = async () => {
    if (!escForm.escalated_to || !escForm.reason.trim()) {
      setEscMsg("❌ All fields are required"); return;
    }
    setEscalating(true); setEscMsg("");
    try {
      await api.post("/approval-escalations", {
        approval_id:  selected.id,
        escalated_to: parseInt(escForm.escalated_to),
        reason:       escForm.reason,
        escalation_level: 1,
      });
      setEscMsg("✅ Escalated successfully!");
      setEscForm({ escalated_to:"", reason:"" });
      fetchApprovals();
      setTimeout(() => { setShowEscModal(false); setEscMsg(""); }, 1500);
    } catch (err) { setEscMsg(`❌ ${err.response?.data?.detail || "Escalation failed"}`); }
    finally { setEscalating(false); }
  };

  const canAct = user?.role === "manager" || user?.role === "admin";

  return (
    <Layout>
      <div className="fade-up max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">Approvals</h2>
            <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
              {user?.role==="employee" ? "Your submitted requests" :
               user?.role==="manager"  ? "Pending requests for your review" :
               "All approval requests"}
            </p>
          </div>
          <div className="flex gap-2">
            {canAct && (
              <button className="btn-secondary !w-auto px-4"
                      onClick={() => navigate("/approval-escalations")}>
                ⬆ Escalations
              </button>
            )}
            <button className="btn-primary !w-auto px-5"
                    onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New Request"}
            </button>
          </div>
        </div>

        {/* New approval form */}
        {showForm && (
          <div className="card mb-6 fade-up">
            <h3 className="font-semibold mb-4">Submit Approval Request</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5"
                       style={{color:"var(--muted)"}}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input className="input-field" placeholder="What needs approval?"
                       value={form.title}
                       onChange={e => setForm(p => ({ ...p, title:e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5"
                       style={{color:"var(--muted)"}}>Description</label>
                <textarea className="input-field resize-none" rows={3}
                          placeholder="Provide more context…"
                          value={form.description}
                          onChange={e => setForm(p => ({ ...p, description:e.target.value }))} />
              </div>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </form>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {/* Approvals list with Phase 8 SLA/Escalation columns */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="card !p-0 overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between"
                   style={{borderColor:"var(--border)"}}>
                <h3 className="font-semibold text-sm">
                  {approvals.length} Request{approvals.length !== 1 ? "s" : ""}
                </h3>
                {/* Column legend for Phase 8 */}
                <div className="flex gap-3 text-xs" style={{color:"var(--muted)"}}>
                  <span>🔵 Active SLA</span>
                  <span>🔴 Breached</span>
                  <span>⬆ Escalated</span>
                </div>
              </div>
              {loading && (
                <p className="text-center py-12 text-sm" style={{color:"var(--muted)"}}>Loading…</p>
              )}
              {!loading && approvals.length === 0 && (
                <p className="text-center py-12 text-sm" style={{color:"var(--muted)"}}>
                  No approval requests found.
                </p>
              )}
              {/* Spec: show SLA Status / SLA Due Time / Escalated / Escalated To columns */}
              {!loading && approvals.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{minWidth:"700px"}}>
                    <thead style={{background:"var(--surface)"}}>
                      <tr>
                        {["Title","Status","SLA Status","SLA Due Time","Escalated","Escalated To"].map(h => (
                          <th key={h}
                              className="text-left px-4 py-3 text-xs font-semibold uppercase"
                              style={{color:"var(--muted)"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map(a => (
                        <tr key={a.id}
                            className="border-t hover:bg-slate-50 cursor-pointer"
                            style={{borderColor:"var(--border)",
                                    background: selected?.id===a.id ? "var(--brand-50)" : undefined}}
                            onClick={() => selectApproval(a)}>
                          {/* Title + status badge */}
                          <td className="px-4 py-3">
                            <p className="font-medium text-sm truncate max-w-48">{a.title}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full capitalize mt-0.5 inline-block"
                                  style={statusStyle[a.status] || statusStyle.pending}>
                              {a.status.replace("_"," ")}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3 text-xs capitalize"
                              style={{color:"var(--muted)"}}>
                            {a.current_level}
                          </td>
                          {/* SLA Status — spec badge */}
                          <td className="px-4 py-3">
                            <SLABadgeSpec slaStatus={a.sla_status} slaDueTime={a.sla_due_time} />
                          </td>
                          {/* SLA Due Time */}
                          <td className="px-4 py-3 text-xs"
                              style={{color: a.sla_due_time && new Date(a.sla_due_time)<new Date()
                                ? "#dc2626" : "var(--muted)"}}>
                            {a.sla_due_time ? fmtFull(a.sla_due_time) : "—"}
                          </td>
                          {/* Escalated */}
                          <td className="px-4 py-3">
                            <EscalatedBadge isEscalated={a.is_escalated} />
                          </td>
                          {/* Escalated To */}
                          <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}>
                            {a.current_escalation_to
                              ? `User #${a.current_escalation_to}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 shrink-0 fade-up">
              <div className="card">
                <h3 className="font-semibold mb-1">{selected.title}</h3>
                {selected.description && (
                  <p className="text-sm mb-3" style={{color:"var(--muted)"}}>
                    {selected.description}
                  </p>
                )}

                {/* Status + Level badges */}
                <div className="flex gap-2 flex-wrap mb-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full capitalize"
                        style={statusStyle[selected.status] || statusStyle.pending}>
                    {selected.status.replace("_"," ")}
                  </span>
                  <span className="text-xs font-medium px-2 py-1 rounded-full capitalize"
                        style={{background:"#e0e7ff",color:"#4338ca"}}>
                    Level: {selected.current_level}
                  </span>
                  {/* Spec: SLA badge */}
                  <SLABadgeSpec
                    slaStatus={selected.sla_status}
                    slaDueTime={selected.sla_due_time} />
                  {/* Spec: Escalation badge */}
                  {selected.is_escalated && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{background:"#fed7aa",color:"#c2410c"}}>
                      ⬆ Escalated
                    </span>
                  )}
                </div>

                {/* Spec: SLA Info block — SLA Due Time + Escalated To */}
                <div className="mb-4 p-3 rounded-xl" style={{background:"var(--surface)"}}>
                  <p className="text-xs font-semibold mb-2" style={{color:"var(--muted)"}}>
                    SLA INFORMATION
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p style={{color:"var(--muted)"}}>SLA Status</p>
                      <p className="font-semibold capitalize mt-0.5">
                        {selected.sla_status || "Not tracked"}
                      </p>
                    </div>
                    <div>
                      <p style={{color:"var(--muted)"}}>SLA Due Time</p>
                      <p className={`font-semibold mt-0.5 ${
                        selected.sla_due_time && new Date(selected.sla_due_time)<new Date()
                          ? "text-red-600" : ""}`}>
                        {selected.sla_due_time ? fmtFull(selected.sla_due_time) : "—"}
                      </p>
                    </div>
                    <div>
                      <p style={{color:"var(--muted)"}}>Escalated</p>
                      <p className="font-semibold mt-0.5">
                        {selected.is_escalated ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      {/* Spec: Escalated To — current user handling escalation */}
                      <p style={{color:"var(--muted)"}}>Escalated To</p>
                      <p className="font-semibold mt-0.5 text-orange-600">
                        {selected.current_escalation_to
                          ? `User #${selected.current_escalation_to}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Spec: SLA Tracking section */}
                {canAct && (
                  <div className="mb-4 p-3 rounded-xl border"
                       style={{borderColor:"var(--border)"}}>
                    <p className="text-xs font-semibold mb-2" style={{color:"var(--muted)"}}>
                      ⏱ SLA TRACKING
                    </p>
                    {!selected.sla_status ? (
                      <>
                        <button onClick={handleStartSLA} disabled={startingSLA}
                                className="w-full text-xs py-2 rounded-lg font-medium"
                                style={{background:"var(--brand)",color:"#fff"}}>
                          {startingSLA ? "Starting…" : "▶ Start SLA Tracking"}
                        </button>
                        <p className="text-xs text-center mt-1" style={{color:"var(--muted)"}}>
                          Begin time tracking for this approval
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-medium text-green-600">
                        ✅ SLA active — {selected.sla_status}
                      </p>
                    )}
                    {slaMsg && (
                      <p className={`text-xs mt-1.5 font-semibold ${
                        slaMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                        {slaMsg}
                      </p>
                    )}
                  </div>
                )}

                {/* Spec: Escalate button + Escalation History button */}
                {canAct && selected.status === "pending" && (
                  <div className="flex gap-2 mb-4">
                    {/* Manual escalate button */}
                    <button onClick={() => { setShowEscModal(true); setEscMsg(""); }}
                            className="flex-1 text-xs py-2 rounded-lg font-semibold"
                            style={{background:"#fed7aa",color:"#c2410c"}}>
                      ⬆ Escalate
                    </button>
                    {/* Escalation history button */}
                    <button onClick={() => navigate("/approval-escalations")}
                            className="flex-1 text-xs py-2 rounded-lg font-medium"
                            style={{background:"#f3f4f6",color:"#374151"}}>
                      📋 History
                    </button>
                  </div>
                )}

                {/* Action panel */}
                {canAct && selected.status === "pending" && (
                  <div className="border-t pt-4 mb-4" style={{borderColor:"var(--border)"}}>
                    <p className="text-xs font-semibold mb-2" style={{color:"var(--muted)"}}>
                      TAKE ACTION
                    </p>
                    <select className="input-field mb-2" value={action}
                            onChange={e => { setAction(e.target.value); setActionError(""); }}>
                      <option value="">— Select action —</option>
                      <option value="approved">✅ Approve</option>
                      <option value="rejected">❌ Reject</option>
                      <option value="on_hold">⏸ Put on Hold</option>
                      {user?.role === "manager" && (
                        <option value="escalate">⬆ Escalate to Admin</option>
                      )}
                    </select>
                    <textarea className="input-field resize-none mb-2" rows={2}
                              placeholder={action==="rejected"
                                ? "Comment required for rejection…"
                                : "Optional comment…"}
                              value={actionComment}
                              onChange={e => setActionComment(e.target.value)} />
                    {actionError && (
                      <p className="text-xs text-red-500 mb-2">{actionError}</p>
                    )}
                    <button className="btn-primary" onClick={handleAction}
                            disabled={acting || !action}>
                      {acting ? "Processing…" : "Submit Action"}
                    </button>
                  </div>
                )}

                {/* Approval History */}
                <div className="border-t pt-4" style={{borderColor:"var(--border)"}}>
                  <p className="text-xs font-semibold mb-3" style={{color:"var(--muted)"}}>
                    APPROVAL HISTORY
                  </p>
                  {history.length === 0 && (
                    <p className="text-xs" style={{color:"var(--muted)"}}>No history yet.</p>
                  )}
                  {history.map(h => (
                    <div key={h.id} className="mb-3 text-xs p-2.5 rounded-xl"
                         style={{background:"var(--surface)"}}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold capitalize px-2 py-0.5 rounded"
                              style={{
                                background: h.action==="approved" ? "#dcfce7"
                                  : h.action==="rejected" ? "#fee2e2"
                                  : h.action==="escalate" ? "#fed7aa"
                                  : "#f3f4f6",
                                color: h.action==="approved" ? "#166534"
                                  : h.action==="rejected" ? "#dc2626"
                                  : h.action==="escalate" ? "#c2410c"
                                  : "#374151",
                              }}>
                          {h.action}
                        </span>
                        <span style={{color:"var(--muted)"}}>{fmt(h.created_at)}</span>
                      </div>
                      {h.actor?.name && (
                        <p className="mb-1" style={{color:"var(--muted)"}}>
                          👤 <span className="font-medium">{h.actor.name}</span>
                          <span className="capitalize ml-1">({h.actor.role})</span>
                        </p>
                      )}
                      {h.comment && (
                        <p className="pl-2 border-l-2 italic"
                           style={{color:"var(--muted)",borderColor:"var(--border)"}}>
                          "{h.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Escalate Modal */}
        {showEscModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
               style={{background:"rgba(0,0,0,0.45)"}}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="font-semibold text-lg mb-5">
                Escalate Approval — #{selected?.id}
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5"
                         style={{color:"var(--muted)"}}>Escalate To *</label>
                  <select className="input-field" value={escForm.escalated_to}
                          onChange={e => setEscForm(p => ({...p, escalated_to:e.target.value}))}>
                    <option value="">— Select user —</option>
                    {users.filter(u => ["admin","manager"].includes(u.role))
                          .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5"
                         style={{color:"var(--muted)"}}>Reason *</label>
                  <textarea className="input-field !h-24 resize-none"
                            placeholder="Why is this being escalated?"
                            value={escForm.reason}
                            onChange={e => setEscForm(p => ({...p, reason:e.target.value}))} />
                </div>
                {escMsg && (
                  <p className={`text-xs font-semibold ${
                    escMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                    {escMsg}
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-5 justify-end">
                <button onClick={() => setShowEscModal(false)}
                        className="btn-secondary !w-auto px-5">Cancel</button>
                <button onClick={handleEscalate} disabled={escalating}
                        className="btn-primary !w-auto px-5">
                  {escalating ? "Escalating…" : "⬆ Escalate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
