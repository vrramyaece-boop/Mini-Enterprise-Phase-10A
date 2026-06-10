// src/pages/Notifications.jsx — Phase 3 NEW
// In-app notifications. Auto-triggered by: task assigned, approvals, comments.
// GET /notifications/  PATCH /notifications/{id}/read  PATCH /notifications/mark-all-read

import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const fmtDt = (d) => d ? new Date(d).toLocaleString("en-IN", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
}) : "";

export default function Notifications() {
  const { user }  = useAuth();
  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => { fetchNotifs(); }, [unreadOnly]);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/notifications/?unread_only=${unreadOnly}`);
      setNotifs(data);
    } catch { setError("Failed to load notifications."); }
    finally  { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { alert("Failed to mark as read."); }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/mark-all-read");
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { alert("Failed."); }
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <Layout>
      <div className="fade-up max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">Notifications</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={unreadOnly}
                     onChange={e => setUnreadOnly(e.target.checked)} />
              Unread only
            </label>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                      className="btn-secondary !w-auto px-4 text-xs">
                Mark all read
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {loading && <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>Loading…</p>}

        {!loading && notifs.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm font-semibold">No notifications</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              You'll be notified when tasks are assigned, approvals actioned, or comments added.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {notifs.map(n => (
            <div key={n.id}
                 className="card flex items-start gap-4"
                 style={{
                   borderLeft: n.is_read ? "3px solid var(--border)" : "3px solid var(--brand)",
                   opacity: n.is_read ? 0.75 : 1,
                 }}>
              {/* Icon */}
              <div className="text-xl shrink-0 mt-0.5">
                {n.message.startsWith("📋") ? "📋" :
                 n.message.startsWith("✅") ? "✅" :
                 n.message.startsWith("❌") ? "❌" :
                 n.message.startsWith("💬") ? "💬" :
                 n.message.startsWith("📎") ? "📎" :
                 n.message.startsWith("⬆") ? "⬆" : "🔔"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm">{n.message.replace(/^[^\s]+ /, "")}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {fmtDt(n.created_at)}
                </p>
              </div>

              {!n.is_read && (
                <button onClick={() => markRead(n.id)}
                        className="text-xs shrink-0 px-2 py-1 rounded"
                        style={{ background: "var(--brand-50)", color: "var(--brand)" }}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
