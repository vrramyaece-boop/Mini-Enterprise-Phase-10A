// pages/Workspaces.jsx — Phase 10A Modules 3+4+5+6
// Tabs: Workspaces | Members | Settings | Usage
// Module 6 improvements:
//   - Dedicated Members tab (not a side panel)
//   - Search members by name/email
//   - Role badge with description + color
//   - Joined date shown per member
//   - Active/inactive status
//   - Duplicate prevention message
//   - Member count vs limit shown
import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const visStyle = {
  PUBLIC:  { background:"#dbeafe", color:"#1d4ed8" },
  PRIVATE: { background:"#fee2e2", color:"#dc2626"  },
};

// Role definitions — matches backend VALID_WS_ROLES
const ROLES = {
  workspace_admin: { label:"Workspace Admin", color:"#7c3aed", bg:"#ede9fe", desc:"Full workspace control" },
  moderator:       { label:"Moderator",       color:"#1d4ed8", bg:"#dbeafe", desc:"Manage channels and members" },
  member:          { label:"Member",          color:"#166534", bg:"#dcfce7", desc:"Normal collaboration access" },
  viewer:          { label:"Viewer",          color:"#92400e", bg:"#fef3c7", desc:"Read-only access" },
};

const fmt     = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const fmtTime = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

// ─────────────────────────────────────────────────────────────
// ROLE BADGE
// ─────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.member;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: r.bg, color: r.color }}>
      {r.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// CREATE / EDIT WORKSPACE MODAL
// ─────────────────────────────────────────────────────────────
function WorkspaceModal({ open, tenants, editItem, selectedTenantId, onSave, onClose }) {
  const blank = useCallback(() => ({
    tenant_id: selectedTenantId || "", name: "", description: "", visibility: "PUBLIC",
  }), [selectedTenantId]);

  const [form, setForm]     = useState(blank());
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setForm(editItem ? {
      tenant_id: editItem.tenant_id, name: editItem.name,
      description: editItem.description || "", visibility: editItem.visibility || "PUBLIC",
    } : { tenant_id: selectedTenantId || "", name: "", description: "", visibility: "PUBLIC" });
  }, [open, editItem, selectedTenantId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setErr("Workspace name is required"); return; }
    if (!form.tenant_id)   { setErr("Please select a tenant"); return; }
    setSaving(true); setErr("");
    try   { await onSave(form); }
    catch (e) { setErr(e.response?.data?.detail || "Save failed"); }
    finally   { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background:"rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="font-semibold text-lg mb-5">{editItem ? "Edit" : "Create"} Workspace</h3>
        <ErrorMessage message={err} />
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>Tenant *</label>
            <select className="input-field" value={form.tenant_id}
              onChange={e => set("tenant_id", parseInt(e.target.value))} disabled={!!editItem}>
              <option value="">— Select Tenant —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>Workspace Name *</label>
            <input className="input-field" value={form.name}
              onChange={e => set("name", e.target.value)} placeholder="e.g. Engineering" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>Description</label>
            <input className="input-field" value={form.description}
              onChange={e => set("description", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>Visibility</label>
            <select className="input-field" value={form.visibility}
              onChange={e => set("visibility", e.target.value)}>
              <option value="PUBLIC">PUBLIC — Open to workspace members</option>
              <option value="PRIVATE">PRIVATE — Restricted access</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto px-6">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT SETTINGS MODAL
// ─────────────────────────────────────────────────────────────
function SettingsModal({ open, settings, tenantName, onSave, onClose }) {
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setForm(settings ? {
      max_workspaces: settings.max_workspaces ?? 5,
      max_channels_per_workspace: settings.max_channels_per_workspace ?? 20,
      max_workspace_members: settings.max_workspace_members ?? 50,
      max_storage_mb: settings.max_storage_mb ?? 1024,
      workspace_enabled: settings.workspace_enabled ?? true,
      channel_enabled: settings.channel_enabled ?? true,
    } : { max_workspaces:5, max_channels_per_workspace:20, max_workspace_members:50, max_storage_mb:1024, workspace_enabled:true, channel_enabled:true });
  }, [open, settings]);

  const handleSave = async () => {
    setSaving(true); setErr("");
    try   { await onSave(form); }
    catch (e) { setErr(e.response?.data?.detail || "Save failed"); }
    finally   { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background:"rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="font-semibold text-lg mb-1">Edit Collaboration Settings</h3>
        <p className="text-xs mb-4" style={{ color:"var(--muted)" }}>{tenantName}</p>
        <ErrorMessage message={err} />
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[
            { k:"max_workspaces",             l:"Max Workspaces" },
            { k:"max_channels_per_workspace", l:"Max Channels/Workspace" },
            { k:"max_workspace_members",      l:"Max Members/Workspace" },
            { k:"max_storage_mb",             l:"Max Storage (MB)" },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>{l}</label>
              <input type="number" className="input-field" value={form[k] ?? ""}
                onChange={e => setForm(p => ({ ...p, [k]: parseInt(e.target.value) || 0 }))} />
            </div>
          ))}
          {[
            { k:"workspace_enabled", l:"Workspace Feature" },
            { k:"channel_enabled",   l:"Channel Feature" },
          ].map(({ k, l }) => (
            <div key={k} className="flex items-center gap-3 col-span-1">
              <input type="checkbox" id={k} checked={!!form[k]}
                onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} />
              <label htmlFor={k} className="text-sm">{l}</label>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto px-6">
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function Workspaces() {
  const { user } = useAuth();

  const [tenants,       setTenants]       = useState([]);
  const [allUsers,      setAllUsers]      = useState([]);
  const [selTenant,     setSelTenant]     = useState(null);
  const [workspaces,    setWorkspaces]    = useState([]);
  const [selected,      setSelected]      = useState(null);  // selected workspace
  const [members,       setMembers]       = useState([]);
  const [memberSearch,  setMemberSearch]  = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [settings,      setSettings]      = useState(null);
  const [usage,         setUsage]         = useState(null);
  const [tab,           setTab]           = useState("workspaces");
  const [loading,       setLoading]       = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error,         setError]         = useState("");
  const [modal,         setModal]         = useState(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const [addForm,       setAddForm]       = useState({ user_id:"", role:"member" });
  const [addErr,        setAddErr]        = useState("");
  const [addSuccess,    setAddSuccess]    = useState("");

  // ── Initial load ──────────────────────────────────────────
  useEffect(() => {
    api.get("/tenants").then(r => setTenants(r.data || [])).catch(() => {});
    api.get("/users").then(r  => setAllUsers(r.data  || [])).catch(() => {});
  }, []);

  // ── Auto-recalculate usage ────────────────────────────────
  const autoRecalculate = useCallback(async (tenantId) => {
    try {
      const { data } = await api.post(`/tenants/${tenantId}/collaboration/recalculate-usage`);
      setUsage(data);
    } catch { }
  }, []);

  // ── Load tenant data ──────────────────────────────────────
  const loadTenantData = useCallback(async (tenantId) => {
    setLoading(true); setError("");
    setWorkspaces([]); setSelected(null); setMembers([]);
    setSettings(null); setUsage(null);
    try {
      const [ws, st, us] = await Promise.allSettled([
        api.get(`/workspaces?tenant_id=${tenantId}`),
        api.get(`/tenants/${tenantId}/collaboration/settings`),
        api.get(`/tenants/${tenantId}/collaboration/usage`),
      ]);
      if (ws.status === "fulfilled") setWorkspaces(ws.value.data || []);
      if (st.status === "fulfilled") setSettings(st.value.data);
      if (us.status === "fulfilled") setUsage(us.value.data);
    } catch { setError("Failed to load tenant data"); }
    finally  { setLoading(false); }
  }, []);

  const handleTenantChange = (e) => {
    const t = tenants.find(t => t.id === parseInt(e.target.value));
    setSelTenant(t || null); setTab("workspaces");
    setSelected(null); setMembers([]);
    if (t) loadTenantData(t.id);
  };

  // ── Load members for selected workspace ──────────────────
  const loadMembers = useCallback(async (workspaceId) => {
    setMemberLoading(true); setMembers([]);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(data || []);
    } catch { setMembers([]); }
    finally { setMemberLoading(false); }
  }, []);

  // When tab switches to Members, load members for selected workspace
  useEffect(() => {
    if (tab === "members" && selected) loadMembers(selected.id);
  }, [tab, selected, loadMembers]);

  // ── Workspace CRUD ────────────────────────────────────────
  const handleCreate = async (form) => {
    const { data } = await api.post("/workspaces", form);
    setWorkspaces(p => [data, ...p]); setModal(null);
    await autoRecalculate(selTenant.id);
  };

  const handleEdit = async (form) => {
    const { data } = await api.put(`/workspaces/${modal.id}`, form);
    setWorkspaces(p => p.map(w => w.id === modal.id ? data : w));
    if (selected?.id === modal.id) setSelected(data); setModal(null);
  };

  const handleArchive = async (id) => {
    const { data } = await api.patch(`/workspaces/${id}/archive`);
    setWorkspaces(p => p.map(w => w.id === id ? data : w));
    if (selected?.id === id) setSelected(data);
    await autoRecalculate(selTenant.id);
  };

  const handleRestore = async (id) => {
    const { data } = await api.patch(`/workspaces/${id}/restore`);
    setWorkspaces(p => p.map(w => w.id === id ? data : w));
    if (selected?.id === id) setSelected(data);
    await autoRecalculate(selTenant.id);
  };

  // ── Settings ──────────────────────────────────────────────
  const handleSaveSettings = async (form) => {
    const { data } = await api.put(`/tenants/${selTenant.id}/collaboration/settings`, form);
    setSettings(data); setSettingsModal(false);
  };

  // ── Usage recalculate ─────────────────────────────────────
  const handleRecalculate = async () => {
    if (!selTenant) return;
    setRecalcLoading(true);
    try {
      const { data } = await api.post(`/tenants/${selTenant.id}/collaboration/recalculate-usage`);
      setUsage(data);
    } catch (e) { setError(e.response?.data?.detail || "Recalculate failed"); }
    finally { setRecalcLoading(false); }
  };

  // ── Module 6: Member handlers ─────────────────────────────
  const handleAddMember = async () => {
    if (!addForm.user_id) { setAddErr("Please select a user"); return; }
    setAddErr(""); setAddSuccess("");
    try {
      const { data } = await api.post(`/workspaces/${selected.id}/members`, {
        user_id: parseInt(addForm.user_id), role: addForm.role,
      });
      setMembers(p => [...p, data]);
      setAddForm({ user_id:"", role:"member" });
      setAddSuccess("✅ Member added successfully!");
      setTimeout(() => setAddSuccess(""), 3000);
      await autoRecalculate(selTenant.id);
    } catch (e) { setAddErr(e.response?.data?.detail || "Failed to add member"); }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.delete(`/workspaces/${selected.id}/members/${userId}`);
      setMembers(p => p.filter(m => m.user_id !== userId));
      await autoRecalculate(selTenant.id);
    } catch (e) { setError(e.response?.data?.detail || "Remove failed"); }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { data } = await api.patch(
        `/workspaces/${selected.id}/members/${userId}/role`, { role: newRole }
      );
      setMembers(p => p.map(m => m.user_id === userId ? data : m));
    } catch (e) { setError(e.response?.data?.detail || "Role update failed"); }
  };

  // ── Filtered members (search) ─────────────────────────────
  const visibleMembers = members.filter(m => {
    if (!memberSearch) return true;
    const u = allUsers.find(u => u.id === m.user_id);
    const name  = (u?.name  || "").toLowerCase();
    const email = (u?.email || "").toLowerCase();
    const q = memberSearch.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  // Already-added user IDs (to prevent duplicate selection)
  const addedUserIds = new Set(members.map(m => m.user_id));

  // Access guard
  if (!user?.is_super_admin && user?.role !== "admin") {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="font-display text-2xl">Admin Access Required</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="fade-up max-w-7xl">
        <PageHeader
          title="Workspaces"
          subtitle="Tenant-aware workspace management with settings, usage and members"
          action={selTenant && tab === "workspaces" && (
            <button onClick={() => setModal("create")} className="btn-primary !w-auto px-5">
              + New Workspace
            </button>
          )}
        />
        <ErrorMessage message={error} />

        {/* Tenant selector */}
        <div className="card mb-5">
          <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>Select Tenant</label>
          <select className="input-field" value={selTenant?.id || ""} onChange={handleTenantChange}>
            <option value="">— Select a tenant to view workspaces —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
          </select>
        </div>

        {selTenant && (
          <>
            {/* ── Tabs ── */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background:"var(--surface)" }}>
              {[
                { k:"workspaces", l:"🗂 Workspaces" },
                { k:"members",    l:"👥 Members" },
                { k:"settings",   l:"⚙️ Settings" },
                { k:"usage",      l:"📊 Usage" },
              ].map(t => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: tab === t.k ? "var(--brand)" : "transparent",
                    color:      tab === t.k ? "#fff" : "var(--muted)",
                  }}>
                  {t.l}
                </button>
              ))}
            </div>

            {/* ════════════════════════════════════
                WORKSPACES TAB
                ════════════════════════════════════ */}
            {tab === "workspaces" && (
              <div className="card !p-0 overflow-hidden">
                {loading ? <LoadingSpinner /> : workspaces.length === 0 ? (
                  <EmptyState icon="🗂" title="No workspaces yet"
                    message="Click '+ New Workspace' to create the first one." />
                ) : (
                  <table className="w-full text-sm">
                    <thead style={{ background:"var(--surface)" }}>
                      <tr>
                        {["Name","Slug","Visibility","Status","Created","Actions"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase"
                            style={{ color:"var(--muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {workspaces.map(w => (
                        <tr key={w.id}
                          onClick={() => { setSelected(w); }}
                          className="border-t hover:bg-slate-50 cursor-pointer"
                          style={{ borderColor:"var(--border)", background: selected?.id === w.id ? "#eff6ff" : undefined }}>
                          <td className="px-4 py-3 font-semibold">{w.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-blue-600">{w.slug}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={visStyle[w.visibility] || visStyle.PUBLIC}>{w.visibility}</span>
                          </td>
                          <td className="px-4 py-3">
                            {w.is_archived
                              ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:"#fee2e2", color:"#dc2626" }}>Archived</span>
                              : <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:"#dcfce7", color:"#166534" }}>Active</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color:"var(--muted)" }}>{fmt(w.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={e => { e.stopPropagation(); setModal(w); }}
                                className="text-xs px-2 py-1 rounded" style={{ background:"#eff6ff", color:"#1d4ed8" }}>Edit</button>
                              {w.is_archived
                                ? <button onClick={e => { e.stopPropagation(); handleRestore(w.id); }}
                                    className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">Restore</button>
                                : <button onClick={e => { e.stopPropagation(); handleArchive(w.id); }}
                                    className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700">Archive</button>
                              }
                              <button
                                onClick={e => { e.stopPropagation(); setSelected(w); setTab("members"); }}
                                className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600">
                                👥 Members
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ════════════════════════════════════
                MEMBERS TAB — Module 6
                ════════════════════════════════════ */}
            {tab === "members" && (
              <div>
                {/* Workspace picker for members tab */}
                <div className="card mb-4">
                  <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                    Select Workspace to Manage Members
                  </label>
                  <select className="input-field" value={selected?.id || ""}
                    onChange={e => {
                      const w = workspaces.find(w => w.id === parseInt(e.target.value));
                      setSelected(w || null);
                      setMembers([]);
                      setMemberSearch("");
                      if (w) loadMembers(w.id);
                    }}>
                    <option value="">— Select Workspace —</option>
                    {workspaces.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.visibility}) {w.is_archived ? "— Archived" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {!selected ? (
                  <EmptyState icon="👥" title="Select a workspace"
                    message="Choose a workspace above to manage its members." />
                ) : (
                  <div className="grid grid-cols-3 gap-5">

                    {/* ── LEFT: Add Member form ── */}
                    <div className="card">
                      <h3 className="font-semibold mb-1">➕ Add Member</h3>
                      <p className="text-xs mb-4" style={{ color:"var(--muted)" }}>
                        Add a user to <strong>{selected.name}</strong>
                      </p>

                      {addSuccess && (
                        <div className="mb-3 p-2 rounded-lg text-xs font-medium"
                          style={{ background:"#f0fdf4", color:"#166534" }}>{addSuccess}</div>
                      )}
                      {addErr && (
                        <div className="mb-3 p-2 rounded-lg text-xs font-medium"
                          style={{ background:"#fee2e2", color:"#dc2626" }}>{addErr}</div>
                      )}

                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                            Select User *
                          </label>
                          <select className="input-field" value={addForm.user_id}
                            onChange={e => setAddForm(p => ({ ...p, user_id: e.target.value }))}>
                            <option value="">— Select User —</option>
                            {allUsers
                              .filter(u => !addedUserIds.has(u.id))
                              .map(u => (
                                <option key={u.id} value={u.id}>
                                  #{u.id} — {u.name} ({u.role})
                                </option>
                              ))
                            }
                          </select>
                          {allUsers.filter(u => !addedUserIds.has(u.id)).length === 0 && (
                            <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>
                              All users are already members.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                            Role *
                          </label>
                          <select className="input-field" value={addForm.role}
                            onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                            {Object.entries(ROLES).map(([val, r]) => (
                              <option key={val} value={val}>{r.label}</option>
                            ))}
                          </select>
                          {/* Role description hint */}
                          {addForm.role && (
                            <p className="text-xs mt-1.5 p-2 rounded-lg"
                              style={{ background: ROLES[addForm.role]?.bg, color: ROLES[addForm.role]?.color }}>
                              {ROLES[addForm.role]?.desc}
                            </p>
                          )}
                        </div>

                        <button onClick={handleAddMember} className="btn-primary">
                          ➕ Add Member
                        </button>
                      </div>

                      {/* Role guide */}
                      <div className="mt-5">
                        <p className="text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>
                          ROLE GUIDE
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {Object.entries(ROLES).map(([val, r]) => (
                            <div key={val} className="flex items-start gap-2 p-2 rounded-lg"
                              style={{ background: r.bg }}>
                              <span className="text-xs font-bold shrink-0" style={{ color: r.color }}>
                                {r.label}
                              </span>
                              <span className="text-xs" style={{ color: r.color, opacity: 0.8 }}>
                                — {r.desc}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── RIGHT: Member list (spans 2 cols) ── */}
                    <div className="col-span-2 card !p-0 overflow-hidden">
                      {/* Member list header */}
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ background:"var(--surface)", borderBottom:"0.5px solid var(--border)" }}>
                        <div>
                          <span className="font-semibold text-sm">👥 Members of {selected.name}</span>
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background:"#eff6ff", color:"#1d4ed8" }}>
                            {members.length}
                            {settings && ` / ${settings.max_workspace_members}`}
                          </span>
                        </div>
                        {/* Search */}
                        <input
                          className="input-field !py-1.5 text-xs"
                          style={{ width:"200px" }}
                          placeholder="🔍 Search by name or email…"
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                        />
                      </div>

                      {memberLoading ? <LoadingSpinner /> :
                       members.length === 0 ? (
                        <EmptyState icon="👥" title="No members yet"
                          message="Add a member using the form on the left." />
                       ) : visibleMembers.length === 0 ? (
                        <EmptyState icon="🔍" title="No results"
                          message={`No members match "${memberSearch}"`} />
                       ) : (
                        <table className="w-full text-sm">
                          <thead style={{ background:"var(--surface)" }}>
                            <tr>
                              {["#","User","Email","Role","Joined","Status","Actions"].map(h => (
                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase"
                                  style={{ color:"var(--muted)" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visibleMembers.map((m, idx) => {
                              const u = allUsers.find(u => u.id === m.user_id);
                              return (
                                <tr key={m.id} className="border-t hover:bg-slate-50"
                                  style={{ borderColor:"var(--border)" }}>
                                  {/* Row number */}
                                  <td className="px-4 py-3 text-xs" style={{ color:"var(--muted)" }}>
                                    {idx + 1}
                                  </td>
                                  {/* Name + ID */}
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-sm">
                                      {u?.name || `User #${m.user_id}`}
                                    </div>
                                    <div className="text-xs" style={{ color:"var(--muted)" }}>
                                      ID #{m.user_id}
                                    </div>
                                  </td>
                                  {/* Email */}
                                  <td className="px-4 py-3 text-xs" style={{ color:"var(--muted)" }}>
                                    {u?.email || "—"}
                                  </td>
                                  {/* Role — inline dropdown to update */}
                                  <td className="px-4 py-3">
                                    <select
                                      className="text-xs px-2 py-1 rounded-lg border font-medium"
                                      style={{
                                        background: ROLES[m.role]?.bg || "#f3f4f6",
                                        color:      ROLES[m.role]?.color || "#374151",
                                        borderColor: ROLES[m.role]?.color || "#d1d5db",
                                      }}
                                      value={m.role}
                                      onChange={e => handleUpdateRole(m.user_id, e.target.value)}>
                                      {Object.entries(ROLES).map(([val, r]) => (
                                        <option key={val} value={val}>{r.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  {/* Joined date */}
                                  <td className="px-4 py-3 text-xs" style={{ color:"var(--muted)" }}>
                                    {fmt(m.joined_at)}
                                  </td>
                                  {/* Active status */}
                                  <td className="px-4 py-3">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={m.is_active
                                        ? { background:"#dcfce7", color:"#166534" }
                                        : { background:"#fee2e2", color:"#dc2626" }
                                      }>
                                      {m.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>
                                  {/* Remove */}
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => handleRemoveMember(m.user_id)}
                                      className="text-xs px-3 py-1 rounded-lg font-medium"
                                      style={{ background:"#fee2e2", color:"#dc2626" }}>
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {/* Usage vs limit bar */}
                      {settings && members.length > 0 && (
                        <div className="px-4 py-3 border-t" style={{ borderColor:"var(--border)" }}>
                          {(() => {
                            const pct = Math.min(100, Math.round((members.length / settings.max_workspace_members) * 100));
                            const col = pct >= 90 ? "#dc2626" : pct >= 70 ? "#f59e0b" : "#16a34a";
                            return (
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span style={{ color:"var(--muted)" }}>Member capacity</span>
                                  <span style={{ color: col, fontWeight:600 }}>
                                    {members.length} / {settings.max_workspace_members} ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full rounded-full h-1.5" style={{ background:"var(--surface)" }}>
                                  <div className="h-1.5 rounded-full" style={{ width:`${pct}%`, background: col }} />
                                </div>
                                {pct >= 90 && (
                                  <p className="text-xs mt-1 text-red-500">
                                    ⚠️ Nearing member limit. Update settings to increase capacity.
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════
                SETTINGS TAB
                ════════════════════════════════════ */}
            {tab === "settings" && (
              <div className="card">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold">⚙️ Collaboration Settings — {selTenant.name}</h3>
                  <button onClick={() => setSettingsModal(true)} className="btn-primary !w-auto px-5 text-sm">
                    ✏️ Edit / Upgrade Plan
                  </button>
                </div>
                {settings ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { label:"Max Workspaces",         value: settings.max_workspaces },
                        { label:"Max Channels/Workspace", value: settings.max_channels_per_workspace },
                        { label:"Max Members/Workspace",  value: settings.max_workspace_members },
                        { label:"Max Storage",            value: `${settings.max_storage_mb} MB` },
                        { label:"Workspace Feature",      value: settings.workspace_enabled ? "✅ Enabled" : "❌ Disabled" },
                        { label:"Channel Feature",        value: settings.channel_enabled   ? "✅ Enabled" : "❌ Disabled" },
                      ].map(r => (
                        <div key={r.label} className="p-4 rounded-xl text-center" style={{ background:"var(--surface)" }}>
                          <p className="text-xs mb-1" style={{ color:"var(--muted)" }}>{r.label}</p>
                          <p className="font-bold text-xl" style={{ color:"var(--brand)" }}>{r.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color:"var(--muted)" }}>
                      💡 Click <strong>Edit / Upgrade Plan</strong> to change limits or toggle features.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm mb-3" style={{ color:"var(--muted)" }}>No settings found.</p>
                    <button onClick={() => setSettingsModal(true)} className="btn-primary !w-auto px-5">
                      Create Settings
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════
                USAGE TAB
                ════════════════════════════════════ */}
            {tab === "usage" && (
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">📊 Collaboration Usage — {selTenant.name}</h3>
                  <button onClick={handleRecalculate} disabled={recalcLoading}
                    className="btn-secondary !w-auto px-4 text-sm">
                    {recalcLoading ? "Recalculating…" : "↻ Recalculate"}
                  </button>
                </div>
                <p className="text-xs mb-5 p-3 rounded-lg" style={{ background:"#fef9c3", color:"#92400e" }}>
                  💡 Counts update automatically when you create/archive workspaces or add/remove members.
                </p>
                {usage ? (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      {[
                        { label:"Workspaces",   value: usage.workspace_count, color:"#2563eb", icon:"🏢" },
                        { label:"Channels",     value: usage.channel_count,   color:"#7c3aed", icon:"💬" },
                        { label:"Members",      value: usage.member_count,    color:"#16a34a", icon:"👥" },
                        { label:"Storage (MB)", value: usage.storage_used_mb, color:"#f59e0b", icon:"💾" },
                      ].map(c => (
                        <div key={c.label} className="card text-center">
                          <p className="text-2xl mb-1">{c.icon}</p>
                          <p className="text-3xl font-bold" style={{ color: c.color }}>{c.value}</p>
                          <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>{c.label}</p>
                        </div>
                      ))}
                    </div>
                    {settings && (
                      <div className="mt-4">
                        <p className="text-xs font-medium mb-3" style={{ color:"var(--muted)" }}>USAGE vs LIMITS</p>
                        <div className="flex flex-col gap-3">
                          {[
                            { label:"Workspaces", used: usage.workspace_count, max: settings.max_workspaces },
                            { label:"Members",    used: usage.member_count,    max: settings.max_workspace_members },
                          ].map(r => {
                            const pct = Math.min(100, Math.round((r.used / (r.max || 1)) * 100));
                            const color = pct >= 90 ? "#dc2626" : pct >= 70 ? "#f59e0b" : "#16a34a";
                            return (
                              <div key={r.label}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>{r.label}</span>
                                  <span style={{ color }}>{r.used} / {r.max} ({pct}%)</span>
                                </div>
                                <div className="w-full rounded-full h-2" style={{ background:"var(--surface)" }}>
                                  <div className="h-2 rounded-full transition-all" style={{ width:`${pct}%`, background: color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <p className="text-xs mt-4" style={{ color:"var(--muted)" }}>
                      Last calculated: {fmt(usage.last_calculated_at)}
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm mb-3" style={{ color:"var(--muted)" }}>No usage data yet.</p>
                    <button onClick={handleRecalculate} disabled={recalcLoading} className="btn-primary !w-auto px-5">
                      {recalcLoading ? "Calculating…" : "Calculate Now"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <WorkspaceModal
          open={!!modal}
          tenants={tenants}
          editItem={modal && modal !== "create" ? modal : null}
          selectedTenantId={selTenant?.id ?? ""}
          onSave={modal && modal !== "create" ? handleEdit : handleCreate}
          onClose={() => setModal(null)}
        />
        <SettingsModal
          open={settingsModal}
          settings={settings}
          tenantName={selTenant?.name}
          onSave={handleSaveSettings}
          onClose={() => setSettingsModal(false)}
        />
      </div>
    </Layout>
  );
}
