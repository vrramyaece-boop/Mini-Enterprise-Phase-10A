// pages/SLADashboard.jsx — Phase 8 Spec compliant
// Cards: Active SLA / Breached SLA / Completed Within SLA / Escalated SLA
// Table columns: Module / Record ID / SLA Status / Start Time / Due Time / Completed Time / Breach Reason / Actions
// Filters: Module / Status
// Tabs: Active / Breached / Completed
import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import FilterBar, { FilterSelect } from "../components/FilterBar";
import { SLABadge } from "../components/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";

const fmt = d => d
  ? new Date(d).toLocaleString("en-IN", { day:"numeric", month:"short",
      year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

function RemainingBadge({ dueTime, status }) {
  if (status === "completed")
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                 style={{background:"#dcfce7",color:"#166534"}}>✅ Completed</span>;
  if (status === "breached")
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                 style={{background:"#fee2e2",color:"#dc2626"}}>🔴 Breached</span>;
  if (!dueTime) return <span style={{color:"var(--muted)"}}>—</span>;
  const diff = new Date(dueTime) - new Date();
  if (diff <= 0) {
    const mins = Math.abs(Math.floor(diff / 60000));
    const h = Math.floor(mins / 60); const m = mins % 60;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                 style={{background:"#fee2e2",color:"#dc2626"}}>
      🔴 {h > 0 ? `${h}h ${m}m` : `${m}m`} overdue
    </span>;
  }
  const mins = Math.floor(diff / 60000);
  const h = Math.floor(mins / 60); const m = mins % 60;
  const warn = diff < 2 * 3600000;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
               style={{background:warn?"#fef3c7":"#dbeafe",
                       color:warn?"#92400e":"#1d4ed8"}}>
    {warn?"⚠️":"🔵"} {h > 0 ? `${h}h ${m}m` : `${m}m`} left
  </span>;
}

function SLAStatusBadge({ record, now }) {
  if (record.status === "completed")
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                 style={{background:"#dcfce7",color:"#166534"}}>✅ Completed</span>;
  if (record.status === "breached")
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                 style={{background:"#fee2e2",color:"#dc2626"}}>🔴 Breached</span>;
  if (record.status === "active" && new Date(record.due_time) < now)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                 style={{background:"#fee2e2",color:"#dc2626"}}>🔴 Overdue</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full"
               style={{background:"#dbeafe",color:"#1d4ed8"}}>🔵 Active</span>;
}

export default function SLADashboard() {
  const [active,   setActive]   = useState([]);
  const [breached, setBreached] = useState([]);
  const [tab,      setTab]      = useState("active");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [fMod,     setFMod]     = useState("all");
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");
  const [detail,    setDetail]    = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      await api.post("/sla-tracking/detect-breaches").catch(() => {});
      const [a, b] = await Promise.all([
        api.get("/sla-tracking/active"),
        api.get("/sla-tracking/breached"),
      ]);
      setActive(a.data  || []);
      setBreached(b.data || []);
    } catch { setError("Failed to load SLA data"); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDetect = async () => {
    setDetecting(true); setDetectMsg("");
    try {
      const { data } = await api.post("/sla-tracking/detect-breaches");
      setDetectMsg(`✅ ${data.marked_breached} record(s) marked breached`);
      loadData();
      setTimeout(() => setDetectMsg(""), 4000);
    } catch (e) { setDetectMsg(`❌ ${e.response?.data?.detail || "Failed"}`); }
    finally { setDetecting(false); }
  };

  const now           = new Date();
  const overdueActive = active.filter(r => r.status === "active" && new Date(r.due_time) < now);
  const trueActive    = active.filter(r => r.status === "active" && new Date(r.due_time) >= now);
  const completed     = active.filter(r => r.status === "completed");

  // Spec cards: Active SLA / Breached SLA / Completed Within SLA / Escalated SLA
  const cards = [
    { label:"Active SLA",           value:trueActive.length,                          color:"#2563eb", icon:"🔵" },
    { label:"Breached SLA",         value:breached.length + overdueActive.length,      color:"#dc2626", icon:"🔴" },
    { label:"Completed Within SLA", value:completed.length,                            color:"#16a34a", icon:"✅" },
    { label:"Escalated SLA",        value:breached.filter(r=>r.status==="breached").length, color:"#f59e0b", icon:"⬆" },
  ];

  // Tab data
  const tabRows =
    tab === "active"   ? [...trueActive, ...overdueActive]
    : tab === "breached" ? breached
    : completed;

  const displayed = tabRows.filter(r => fMod === "all" || r.module_name === fMod);

  return (
    <Layout>
      <div className="fade-up max-w-7xl">
        <PageHeader title="SLA Dashboard"
          subtitle="Monitor SLA compliance for tasks and approvals in real time"
          action={
            <div className="flex gap-2 items-center flex-wrap">
              {detectMsg && (
                <span className={`text-xs font-medium ${detectMsg.startsWith("✅")?"text-green-600":"text-red-600"}`}>
                  {detectMsg}
                </span>
              )}
              <button onClick={handleDetect} disabled={detecting}
                      className="btn-secondary !w-auto px-4 text-sm">
                {detecting ? "Detecting…" : "🔍 Detect Breaches"}
              </button>
              <button onClick={loadData} disabled={loading}
                      className="btn-primary !w-auto px-4 text-sm">
                ⟳ Refresh
              </button>
            </div>
          } />

        <ErrorMessage message={error} />

        {/* Info banner */}
        <div className="mb-5 p-3 rounded-xl text-xs"
             style={{background:"#eff6ff",color:"#1e40af",border:"1px solid #bfdbfe"}}>
          <strong>ℹ️ SLA Due Time</strong> = Time you clicked "Start SLA" + Allowed Hours from SLA Rule.
          It is <strong>not</strong> the task's due date. Use 720h rules to see Active records.
        </div>

        {/* Summary cards — spec: Active / Breached / Completed / Escalated */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {cards.map(c => (
            <div key={c.label} className="card text-center cursor-pointer hover:shadow-md transition-shadow"
                 onClick={() => setTab(
                   c.label.includes("Active")?"active":
                   c.label.includes("Breached")?"breached":"completed"
                 )}>
              <p className="text-2xl mb-1">{c.icon}</p>
              <p className="text-3xl font-bold" style={{color:c.color}}>{c.value}</p>
              <p className="text-xs mt-1 font-medium">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{background:"var(--surface)"}}>
          {[
            {k:"active",   l:`Active (${trueActive.length + overdueActive.length})`},
            {k:"breached", l:`Breached (${breached.length})`},
            {k:"completed",l:`Completed (${completed.length})`},
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
                    className="px-5 text-sm py-2 rounded-lg font-medium transition-colors"
                    style={{background:tab===t.k?"white":"transparent",
                            color:tab===t.k?"var(--brand)":"var(--muted)",
                            boxShadow:tab===t.k?"0 1px 4px rgba(0,0,0,.08)":"none"}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Filters */}
        <FilterBar>
          <FilterSelect label="Module" value={fMod} onChange={setFMod}
            options={[
              {value:"all",      label:"All Modules"},
              {value:"task",     label:"Task"},
              {value:"approval", label:"Approval"},
            ]} />
        </FilterBar>

        {/* Table — spec columns: Module / Record ID / SLA Status / Start / Due / Completed / Breach Reason / Actions */}
        <div className="card !p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : displayed.length === 0 ? (
            <EmptyState icon="⏱" title={`No ${tab} SLA records`}
              message={tab==="active"
                ? "Start SLA tracking from the Dashboard task list or EditTask page."
                : tab==="breached"
                ? "No breached records. Click 'Detect Breaches' to check overdue ones."
                : "Mark SLA tracking as complete via PUT /sla-tracking/{id}/complete"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{minWidth:"900px"}}>
                <thead style={{background:"var(--surface)"}}>
                  <tr>
                    {["Module","Record ID","SLA Status","Start Time",
                      "Due Time","Completed Time","Remaining","Breach Reason","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                          style={{color:"var(--muted)"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(r => (
                    <tr key={r.id}
                        className="border-t hover:bg-slate-50"
                        style={{borderColor:"var(--border)",
                                background: r.status==="breached"||(r.status==="active"&&new Date(r.due_time)<now)
                                  ? "#fff5f5" : undefined}}>
                      {/* Module */}
                      <td className="px-4 py-3 capitalize font-medium">{r.module_name}</td>
                      {/* Record ID */}
                      <td className="px-4 py-3 font-mono text-blue-600">#{r.record_id}</td>
                      {/* SLA Status — spec badges */}
                      <td className="px-4 py-3"><SLAStatusBadge record={r} now={now} /></td>
                      {/* Start Time */}
                      <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}>{fmt(r.start_time)}</td>
                      {/* Due Time */}
                      <td className="px-4 py-3 text-xs font-medium"
                          style={{color:new Date(r.due_time)<now?"#dc2626":undefined}}>
                        {fmt(r.due_time)}
                      </td>
                      {/* Completed Time */}
                      <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}>
                        {fmt(r.completed_time)}
                      </td>
                      {/* Remaining */}
                      <td className="px-4 py-3">
                        <RemainingBadge dueTime={r.due_time} status={r.status} />
                      </td>
                      {/* Breach Reason */}
                      <td className="px-4 py-3 text-xs text-red-600 max-w-xs"
                          title={r.breach_reason}>
                        {r.breach_reason
                          ? <span className="truncate block max-w-32">{r.breach_reason}</span>
                          : <span style={{color:"var(--muted)"}}>—</span>}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button onClick={() => setDetail(r)}
                                className="text-xs px-2 py-1 rounded font-medium"
                                style={{background:"var(--brand-50)",color:"var(--brand)"}}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail modal */}
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
               style={{background:"rgba(0,0,0,0.4)"}}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-lg">SLA Record Detail</h3>
                <button onClick={() => setDetail(null)}
                        className="text-2xl leading-none" style={{color:"var(--muted)"}}>×</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:"Module",         value:detail.module_name},
                  {label:"Record ID",      value:`#${detail.record_id}`},
                  {label:"SLA Status",     value:detail.status},
                  {label:"SLA Rule ID",    value:`#${detail.sla_rule_id}`},
                  {label:"Start Time",     value:fmt(detail.start_time)},
                  {label:"Due Time",       value:fmt(detail.due_time)},
                  {label:"Completed Time", value:fmt(detail.completed_time)},
                  {label:"Breach Reason",  value:detail.breach_reason || "—"},
                ].map(row => (
                  <div key={row.label} className="p-3 rounded-xl"
                       style={{background:"var(--surface)"}}>
                    <p className="text-xs font-medium mb-0.5" style={{color:"var(--muted)"}}>
                      {row.label}
                    </p>
                    <p className="text-sm font-medium capitalize break-all">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
