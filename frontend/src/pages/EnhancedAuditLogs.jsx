// pages/EnhancedAuditLogs.jsx — Phase 8: Enhanced Audit Logs
// Filter by module / user / date range. Detail modal with old_data, new_data, ip, user_agent.
import { useState, useEffect } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import FilterBar, { FilterSelect, FilterInput } from "../components/FilterBar";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const fmt = d => d ? new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

// ── Detail Modal ──────────────────────────────────────────
function DetailModal({ log, onClose }) {
  if (!log) return null;
  const rows = [
    { label:"Log ID",     value:`#${log.id}` },
    { label:"User",       value:log.actor?.name || `User #${log.user_id}` },
    { label:"Action",     value:log.action },
    { label:"Action Type",value:log.action_type || "—" },
    { label:"Module",     value:log.module_name || log.entity || "—" },
    { label:"Entity",     value:log.entity },
    { label:"Entity ID",  value:log.entity_id ?? "—" },
    { label:"Record ID",  value:log.record_id  ?? "—" },
    { label:"IP Address", value:log.ip_address  || "—" },
    { label:"User Agent", value:log.user_agent  || "—" },
    { label:"Timestamp",  value:fmt(log.timestamp) },
    { label:"Detail",     value:log.detail || "—" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{background:"rgba(0,0,0,0.45)"}}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-lg">Audit Log Detail</h3>
          <button onClick={onClose} className="text-2xl leading-none"
                  style={{color:"var(--muted)"}}>×</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {rows.map(r=>(
            <div key={r.label} className="p-3 rounded-xl" style={{background:"var(--surface)"}}>
              <p className="text-xs font-medium mb-0.5" style={{color:"var(--muted)"}}>{r.label}</p>
              <p className="text-sm font-medium break-all">{String(r.value)}</p>
            </div>
          ))}
        </div>
        {log.old_data && (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-1 text-red-600">Old Data</p>
            <pre className="text-xs p-3 rounded-xl overflow-auto"
                 style={{background:"#fff5f5",maxHeight:120}}>{log.old_data}</pre>
          </div>
        )}
        {log.new_data && (
          <div>
            <p className="text-xs font-semibold mb-1 text-green-600">New Data</p>
            <pre className="text-xs p-3 rounded-xl overflow-auto"
                 style={{background:"#f0fdf4",maxHeight:120}}>{log.new_data}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function EnhancedAuditLogs() {
  const { user }    = useAuth();
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState(null);
  const [fMod,  setFMod]        = useState("all");
  const [fUser, setFUser]       = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  const loadLogs = async () => {
    setLoading(true); setError("");
    try {
      let res;
      if (fMod !== "all") {
        res = await api.get(`/audit-logs/module/${fMod}`);
        setLogs(res.data?.items || res.data || []);
      } else if (fUser) {
        res = await api.get(`/audit-logs/user/${fUser}`);
        setLogs(res.data?.items || res.data || []);
      } else if (startDate && endDate) {
        res = await api.get(`/audit-logs/date-range?start_date=${startDate}:00&end_date=${endDate}:00`);
        setLogs(res.data?.items || res.data || []);
      } else {
        res = await api.get("/audit-logs/enhanced");
        setLogs(res.data?.items || res.data || []);
      }
    } catch { setError("Failed to load audit logs"); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ loadLogs(); },[]);

  if (user?.role !== "admin") return (
    <Layout><div className="text-center py-20">
      <p className="text-4xl mb-4">🔒</p>
      <h2 className="font-display text-2xl">Admin Access Required</h2>
    </div></Layout>
  );

  return (
    <Layout>
      <div className="fade-up max-w-7xl">
        <PageHeader title="Audit Logs" subtitle="Detailed system activity trail with full context and filters" />
        <ErrorMessage message={error} />

        <FilterBar>
          <FilterSelect label="Module" value={fMod} onChange={setFMod}
            options={[{value:"all",label:"All Modules"},{value:"task",label:"Task"},
              {value:"approval",label:"Approval"},{value:"document",label:"Document"},
              {value:"sla",label:"SLA"},{value:"notification",label:"Notification"}]} />
          <FilterInput label="User ID" value={fUser} onChange={setFUser} placeholder="e.g. 3" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{color:"var(--muted)"}}>Start Date</label>
            <input type="datetime-local" className="input-field !py-1.5 !text-sm"
                   value={startDate} onChange={e=>setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{color:"var(--muted)"}}>End Date</label>
            <input type="datetime-local" className="input-field !py-1.5 !text-sm"
                   value={endDate} onChange={e=>setEndDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary !w-auto px-4 !py-1.5 text-sm" onClick={loadLogs}>
              Apply Filters
            </button>
          </div>
        </FilterBar>

        <div className="card !p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : logs.length===0 ? (
            <EmptyState icon="📋" title="No audit logs found" />
          ) : (
            <table className="w-full text-sm">
              <thead style={{background:"var(--surface)"}}>
                <tr>{["Log ID","User","Module","Action Type","Record ID","IP Address","Timestamp","Actions"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{color:"var(--muted)"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {logs.map(log=>(
                  <tr key={log.id} className="border-t hover:bg-slate-50" style={{borderColor:"var(--border)"}}>
                    <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}># {log.id}</td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {log.actor?.name || `User #${log.user_id}`}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{log.module_name||log.entity||"—"}</td>
                    <td className="px-4 py-3 text-xs">{log.action_type||log.action||"—"}</td>
                    <td className="px-4 py-3 text-xs font-mono">{log.record_id||log.entity_id||"—"}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{color:"var(--muted)"}}>
                      {log.ip_address||"—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}>{fmt(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <button onClick={()=>setSelected(log)}
                              className="text-xs px-2 py-1 rounded"
                              style={{background:"var(--brand-50)",color:"var(--brand)"}}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DetailModal log={selected} onClose={()=>setSelected(null)} />
      </div>
    </Layout>
  );
}
