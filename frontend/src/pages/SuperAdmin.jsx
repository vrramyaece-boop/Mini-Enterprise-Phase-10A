// pages/SuperAdmin.jsx — Phase 10A: Platform-Level Super Admin Dashboard
// Only visible to users with is_super_admin === true
import { useState, useEffect } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const fmt = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";

const statusColor = {
  ACTIVE:    { bg:"#dcfce7", color:"#166534" },
  SUSPENDED: { bg:"#fee2e2", color:"#dc2626" },
  TRIAL:     { bg:"#fef3c7", color:"#92400e" },
  CANCELLED: { bg:"#f3f4f6", color:"#6b7280" },
};

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold" style={{ color: color || "var(--brand)" }}>{value ?? "—"}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{label}</p>
      </div>
    </div>
  );
}

// ── Create Super Admin Modal ─────────────────────────────────
function CreateSuperAdminModal({ open, onCreated, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setForm({ name:"", email:"", password:"" }); setErr(""); } }, [open]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErr("All fields are required"); return;
    }
    setSaving(true); setErr("");
    try {
      const { data } = await api.post("/super-admin/create", form);
      onCreated(data);
    } catch (e) { setErr(e.response?.data?.detail || "Failed to create super admin"); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="font-semibold text-lg mb-5">🛡️ Create Super Admin</h3>
        <p className="text-xs mb-4 p-3 rounded-lg" style={{ background: "#fef9c3", color: "#92400e" }}>
          Super Admins have full platform-level access. They can manage ALL tenants, workspaces, and channels.
        </p>
        <ErrorMessage message={err} />
        <div className="flex flex-col gap-3 mb-5">
          {[
            { key: "name",     label: "Full Name *",    type: "text" },
            { key: "email",    label: "Email *",        type: "email" },
            { key: "password", label: "Password *",     type: "password" },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
              <input type={type} className="input-field" value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto px-6">
            {saving ? "Creating…" : "Create Super Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SuperAdmin() {
  const { user } = useAuth();
  const [stats,       setStats]       = useState(null);
  const [tenants,     setTenants]     = useState([]);
  const [admins,      setAdmins]      = useState([]);
  const [tab,         setTab]         = useState("overview"); // overview | tenants | admins
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [showCreate,  setShowCreate]  = useState(false);

  // Redirect if not super admin
  if (!user?.is_super_admin) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="font-display text-2xl mb-2">Super Admin Access Required</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            This page is only accessible to platform-level Super Admins.
          </p>
        </div>
      </Layout>
    );
  }

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [s, t, a] = await Promise.all([
        api.get("/super-admin/platform-stats"),
        api.get("/super-admin/tenants"),
        api.get("/super-admin/list"),
      ]);
      setStats(s.data);
      setTenants(t.data || []);
      setAdmins(a.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load platform data");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleAdminCreated = (newAdmin) => {
    setAdmins(p => [newAdmin, ...p]);
    setShowCreate(false);
    setStats(p => p ? { ...p, total_super_admins: (p.total_super_admins || 0) + 1 } : p);
  };

  const handleDeactivate = async (id) => {
    try {
      const { data } = await api.patch(`/super-admin/${id}/deactivate`);
      setAdmins(p => p.map(a => a.id === id ? data : a));
    } catch (e) { alert(e.response?.data?.detail || "Failed to deactivate"); }
  };

  const handleActivate = async (id) => {
    try {
      const { data } = await api.patch(`/super-admin/${id}/activate`);
      setAdmins(p => p.map(a => a.id === id ? data : a));
    } catch (e) { alert(e.response?.data?.detail || "Failed to activate"); }
  };

  return (
    <Layout>
      <div className="fade-up max-w-6xl">
        <PageHeader
          title="🛡️ Super Admin — Platform Control"
          subtitle="Platform-level management: all tenants, super admins, and system health"
          action={
            <button className="btn-primary !w-auto px-5" onClick={() => setShowCreate(true)}>
              + New Super Admin
            </button>
          }
        />
        <ErrorMessage message={error} />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--surface)" }}>
          {[
            { key: "overview", label: "📊 Overview" },
            { key: "tenants",  label: "🏢 All Tenants" },
            { key: "admins",   label: "🛡️ Super Admins" },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t.key ? "var(--brand)" : "transparent",
                color: tab === t.key ? "#fff" : "var(--muted)",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* ── Overview Tab ── */}
            {tab === "overview" && stats && (
              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase" style={{ color: "var(--muted)" }}>Platform Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard label="Total Tenants"    value={stats.total_tenants}    icon="🏢" color="#6366f1" />
                  <StatCard label="Active Tenants"   value={stats.active_tenants}   icon="✅" color="#16a34a" />
                  <StatCard label="Suspended"        value={stats.suspended_tenants}icon="⛔" color="#dc2626" />
                  <StatCard label="Trial"            value={stats.trial_tenants}    icon="🔶" color="#d97706" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Workspaces" value={stats.total_workspaces} icon="🗂️" color="#0891b2" />
                  <StatCard label="Total Channels"   value={stats.total_channels}   icon="💬" color="#7c3aed" />
                  <StatCard label="Total Users"      value={stats.total_users}      icon="👥" color="#059669" />
                  <StatCard label="Super Admins"     value={stats.total_super_admins} icon="🛡️" color="#b45309" />
                </div>
              </div>
            )}

            {/* ── Tenants Tab ── */}
            {tab === "tenants" && (
              <div className="card !p-0 overflow-hidden">
                {tenants.length === 0 ? (
                  <EmptyState icon="🏢" title="No tenants yet" message="No tenants have been created on the platform yet." />
                ) : (
                  <table className="w-full text-sm">
                    <thead style={{ background: "var(--surface)" }}>
                      <tr>
                        {["Name", "Slug", "Email", "Industry", "Status", "Workspaces", "Channels", "Members", "Created"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map(t => (
                        <tr key={t.id} className="border-t hover:bg-slate-50" style={{ borderColor: "var(--border)" }}>
                          <td className="px-4 py-3 font-semibold">{t.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-blue-600">{t.slug}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>{t.contact_email}</td>
                          <td className="px-4 py-3 text-xs capitalize">{t.industry || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={statusColor[t.status] || statusColor.TRIAL}>{t.status}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{t.workspace_count}</td>
                          <td className="px-4 py-3 text-center font-semibold text-purple-600">{t.channel_count}</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{t.member_count}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>{fmt(t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Super Admins Tab ── */}
            {tab === "admins" && (
              <div className="card !p-0 overflow-hidden">
                {admins.length === 0 ? (
                  <EmptyState icon="🛡️" title="No super admins" message="No super admins found." />
                ) : (
                  <table className="w-full text-sm">
                    <thead style={{ background: "var(--surface)" }}>
                      <tr>
                        {["Name", "Email", "Status", "Created", "Actions"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map(a => (
                        <tr key={a.id} className="border-t hover:bg-slate-50" style={{ borderColor: "var(--border)" }}>
                          <td className="px-4 py-3 font-semibold flex items-center gap-2">
                            🛡️ {a.name}
                            {a.id === user?.id && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">(You)</span>}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>{a.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                              {a.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>{fmt(a.created_at)}</td>
                          <td className="px-4 py-3">
                            {a.id !== user?.id && (
                              a.is_active
                                ? <button onClick={() => handleDeactivate(a.id)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600">Deactivate</button>
                                : <button onClick={() => handleActivate(a.id)} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">Activate</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        <CreateSuperAdminModal open={showCreate} onCreated={handleAdminCreated} onClose={() => setShowCreate(false)} />
      </div>
    </Layout>
  );
}
