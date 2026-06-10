// src/pages/AuditLogs.jsx — Phase 3 NEW (Admin only)
// View full immutable system audit trail. GET /audit-logs/

import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

const fmtDt = (d) => d ? new Date(d).toLocaleString("en-IN", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
}) : "—";

const actionColor = (action) => {
  if (action.includes("created"))  return { bg: "#dcfce7", color: "#166534" };
  if (action.includes("deleted"))  return { bg: "#fee2e2", color: "#dc2626" };
  if (action.includes("updated") || action.includes("assigned")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (action.includes("upload"))   return { bg: "#fef9c3", color: "#854d0e" };
  if (action.includes("approval")) return { bg: "#f3e8ff", color: "#7e22ce" };
  return { bg: "#f3f4f6", color: "#374151" };
};

export default function AuditLogs() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/dashboard"); return; }
    api.get("/audit-logs/?limit=200")
       .then(r => setLogs(r.data))
       .catch(() => setError("Failed to load audit logs."))
       .finally(() => setLoading(false));
  }, [user, navigate]);

  const filtered = filter
    ? logs.filter(l =>
        l.action.includes(filter) || l.entity.includes(filter) ||
        l.actor?.name?.toLowerCase().includes(filter.toLowerCase()) ||
        l.detail?.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <Layout>
      <div className="fade-up max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">Audit Logs</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Immutable record of every system action — Admin only
            </p>
          </div>
          <input className="input-field !w-64" placeholder="🔍 Filter by action, user, entity…"
                 value={filter} onChange={e => setFilter(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold">{filtered.length} log entries</p>
          </div>

          {loading && <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}

          {!loading && filtered.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>No logs found.</p>
          )}

          {!loading && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface)" }}>
                <tr>
                  {["Time", "User", "Action", "Entity", "Detail"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold"
                        style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const colors = actionColor(log.action);
                  return (
                    <tr key={log.id} className="border-t hover:bg-slate-50"
                        style={{ borderColor: "var(--border)" }}>
                      <td className="px-5 py-3 text-xs whitespace-nowrap"
                          style={{ color: "var(--muted)" }}>{fmtDt(log.timestamp)}</td>
                      <td className="px-5 py-3 font-medium">{log.actor?.name || `User #${log.user_id}`}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ background: colors.bg, color: colors.color }}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs capitalize"
                          style={{ color: "var(--muted)" }}>
                        {log.entity} {log.entity_id ? `#${log.entity_id}` : ""}
                      </td>
                      <td className="px-5 py-3 text-xs max-w-xs truncate"
                          style={{ color: "var(--muted)" }}>{log.detail || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
