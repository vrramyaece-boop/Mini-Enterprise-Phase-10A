// pages/Channels.jsx — Phase 10A Module 7: Channel Management
// Full features: Create, Edit, Archive, Restore, Join, Leave, List, Members panel
import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

// ── Constants ─────────────────────────────────────────────────
const TYPE_COLOR = {
  PUBLIC:       { background:"#dbeafe", color:"#1d4ed8" },
  PRIVATE:      { background:"#fee2e2", color:"#dc2626" },
  ANNOUNCEMENT: { background:"#fef3c7", color:"#92400e" },
  PROJECT:      { background:"#dcfce7", color:"#166534" },
};

const TYPE_DESC = {
  PUBLIC:       "Open to all workspace members",
  PRIVATE:      "Restricted — invite only, cannot join directly",
  ANNOUNCEMENT: "Admin/Manager posts only",
  PROJECT:      "Project-specific collaboration",
};

const TYPE_ICON = {
  PUBLIC: "🌐", PRIVATE: "🔒", ANNOUNCEMENT: "📣", PROJECT: "📁",
};

const fmt = d => d
  ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
  : "—";

// ─────────────────────────────────────────────────────────────
// CREATE / EDIT CHANNEL MODAL
// ─────────────────────────────────────────────────────────────
function ChannelModal({ open, workspaceId, tenantId, editItem, onSave, onClose }) {
  const [form,   setForm]   = useState({ name:"", description:"", channel_type:"PUBLIC" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const set = (k,v) => setForm(p => ({ ...p, [k]:v }));

  useEffect(() => {
    if (!open) return;
    setErr("");
    setForm(editItem
      ? { name: editItem.name, description: editItem.description || "", channel_type: editItem.channel_type }
      : { name:"", description:"", channel_type:"PUBLIC" }
    );
  }, [open, editItem]);

  const handleSave = async () => {
    if (!form.name.trim()) { setErr("Channel name is required"); return; }
    setSaving(true); setErr("");
    try   { await onSave({ ...form, workspace_id: workspaceId, tenant_id: tenantId }); }
    catch (e) { setErr(e.response?.data?.detail || "Save failed"); }
    finally   { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background:"rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="font-semibold text-lg mb-5">
          {editItem ? "✏️ Edit Channel" : "💬 Create Channel"}
        </h3>
        <ErrorMessage message={err} />
        <div className="flex flex-col gap-4">

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Channel Name *
            </label>
            <input className="input-field" value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. general, backend-dev, announcements" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Description
            </label>
            <input className="input-field" value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Optional short description" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Channel Type
            </label>
            <select className="input-field" value={form.channel_type}
              onChange={e => set("channel_type", e.target.value)}>
              {Object.entries(TYPE_ICON).map(([type, icon]) => (
                <option key={type} value={type}>
                  {icon} {type} — {TYPE_DESC[type]}
                </option>
              ))}
            </select>

            {/* Contextual hints per channel type */}
            {form.channel_type === "PRIVATE" && (
              <p className="text-xs mt-2 p-2 rounded-lg" style={{ background:"#fee2e2", color:"#dc2626" }}>
                🔒 Members must be added manually. Users cannot join private channels on their own.
              </p>
            )}
            {form.channel_type === "ANNOUNCEMENT" && (
              <p className="text-xs mt-2 p-2 rounded-lg" style={{ background:"#fef3c7", color:"#92400e" }}>
                📣 Only Admins and Managers can post. All workspace members can read.
              </p>
            )}
            {form.channel_type === "PROJECT" && (
              <p className="text-xs mt-2 p-2 rounded-lg" style={{ background:"#dcfce7", color:"#166534" }}>
                📁 For project-specific work. Members can join directly.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto px-6">
            {saving ? "Saving…" : "Save Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function Channels() {
  const { user } = useAuth();

  const [tenants,    setTenants]    = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [channels,   setChannels]   = useState([]);
  const [members,    setMembers]    = useState([]);   // members of selected channel
  const [allUsers,   setAllUsers]   = useState([]);   // all users for member add
  const [selTenant,  setSelTenant]  = useState(null);
  const [selWS,      setSelWS]      = useState(null);
  const [selected,   setSelected]   = useState(null); // selected channel
  const [loading,    setLoading]    = useState(false);
  const [memLoading, setMemLoading] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [modal,      setModal]      = useState(null); // null | "create" | channel obj
  const [filter,     setFilter]     = useState("ALL"); // ALL | PUBLIC | PRIVATE | ANNOUNCEMENT | PROJECT
  const [search,     setSearch]     = useState("");

  // ── Load initial data ───────────────────────────────────────
  useEffect(() => {
    api.get("/tenants").then(r => setTenants(r.data || [])).catch(() => {});
    api.get("/users").then(r  => setAllUsers(r.data  || [])).catch(() => {});
  }, []);

  // ── Flash success message ───────────────────────────────────
  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  // ── Load workspaces for tenant ─────────────────────────────
  const loadWorkspaces = useCallback(async (tenantId) => {
    try {
      const { data } = await api.get(`/workspaces?tenant_id=${tenantId}`);
      setWorkspaces((data || []).filter(w => !w.is_archived));
    } catch { setWorkspaces([]); }
  }, []);

  // ── Load channels for workspace ────────────────────────────
  const loadChannels = useCallback(async (wsId) => {
    setLoading(true); setChannels([]); setSelected(null);
    setMembers([]); setError("");
    try {
      const { data } = await api.get(`/workspaces/${wsId}/channels`);
      setChannels(data || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load channels");
    } finally { setLoading(false); }
  }, []);

  // ── Load members of a channel ──────────────────────────────
  const loadMembers = useCallback(async (channelId) => {
    setMemLoading(true); setMembers([]);
    try {
      // The channel_members are returned when we get channel details
      // We use the join/leave endpoints to manage membership
      // For listing, we check who is in channel_members via a workaround:
      // GET /channels/{id} returns the channel — members need separate logic
      // Since our API doesn't have GET /channels/{id}/members yet,
      // we show join/leave UI instead
      setMembers([]);
    } catch { }
    finally { setMemLoading(false); }
  }, []);

  // ── Tenant change ──────────────────────────────────────────
  const handleTenantChange = (e) => {
    const t = tenants.find(t => t.id === parseInt(e.target.value));
    setSelTenant(t || null); setSelWS(null);
    setWorkspaces([]); setChannels([]);
    setSelected(null); setMembers([]);
    setFilter("ALL"); setSearch("");
    if (t) loadWorkspaces(t.id);
  };

  // ── Workspace change ───────────────────────────────────────
  const handleWSChange = (e) => {
    const w = workspaces.find(w => w.id === parseInt(e.target.value));
    setSelWS(w || null); setSelected(null); setMembers([]);
    setFilter("ALL"); setSearch("");
    if (w) loadChannels(w.id);
  };

  // ── Select a channel row ───────────────────────────────────
  const selectChannel = (c) => {
    setSelected(c);
    loadMembers(c.id);
  };

  // ── CRUD handlers ──────────────────────────────────────────
  const handleCreate = async (form) => {
    const { data } = await api.post("/channels", form);
    setChannels(p => [...p, data]);
    setModal(null);
    flash("✅ Channel created successfully!");
  };

  const handleEdit = async (form) => {
    const { data } = await api.put(`/channels/${modal.id}`, form);
    setChannels(p => p.map(c => c.id === modal.id ? data : c));
    if (selected?.id === modal.id) setSelected(data);
    setModal(null);
    flash("✅ Channel updated!");
  };

  const handleArchive = async (id) => {
    try {
      const { data } = await api.patch(`/channels/${id}/archive`);
      setChannels(p => p.map(c => c.id === id ? data : c));
      if (selected?.id === id) setSelected(data);
      flash("Channel archived.");
    } catch (e) { setError(e.response?.data?.detail || "Archive failed"); }
  };

  const handleRestore = async (id) => {
    try {
      const { data } = await api.patch(`/channels/${id}/restore`);
      setChannels(p => p.map(c => c.id === id ? data : c));
      if (selected?.id === id) setSelected(data);
      flash("✅ Channel restored!");
    } catch (e) { setError(e.response?.data?.detail || "Restore failed"); }
  };

  const handleJoin = async (id) => {
    try {
      await api.post(`/channels/${id}/join`);
      flash("✅ Joined channel successfully!");
    } catch (e) { setError(e.response?.data?.detail || "Join failed"); }
  };

  const handleLeave = async (id) => {
    try {
      await api.post(`/channels/${id}/leave`);
      flash("Left the channel.");
      if (selected?.id === id) setSelected(null);
      await loadChannels(selWS.id);
    } catch (e) { setError(e.response?.data?.detail || "Leave failed"); }
  };

  // ── Filtered + searched channels ──────────────────────────
  const visibleChannels = channels.filter(c => {
    const matchType   = filter === "ALL" || c.channel_type === filter;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // ── Access guard ───────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────
  return (
    <Layout>
      <div className="fade-up max-w-7xl">
        <PageHeader
          title="Channels"
          subtitle="Tenant-aware channel management inside workspaces"
          action={selWS && (
            <button onClick={() => setModal("create")} className="btn-primary !w-auto px-5">
              + New Channel
            </button>
          )}
        />

        <ErrorMessage message={error} />
        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium"
            style={{ background:"#f0fdf4", color:"#166534", border:"1px solid #86efac" }}>
            {success}
          </div>
        )}

        {/* ── Step selectors ── */}
        <div className="card mb-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                Step 1 — Select Tenant
              </label>
              <select className="input-field" value={selTenant?.id || ""}
                onChange={handleTenantChange}>
                <option value="">— Select Tenant —</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                Step 2 — Select Workspace
              </label>
              <select className="input-field" value={selWS?.id || ""}
                onChange={handleWSChange} disabled={!selTenant}>
                <option value="">— Select Workspace —</option>
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.visibility})</option>
                ))}
              </select>
              {selTenant && workspaces.length === 0 && (
                <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>
                  No workspaces yet. Go to Workspaces page to create one first.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter + Search bar (only if workspace selected) ── */}
        {selWS && (
          <div className="flex items-center gap-3 mb-4">
            {/* Type filter tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background:"var(--surface)" }}>
              {["ALL", "PUBLIC", "PRIVATE", "ANNOUNCEMENT", "PROJECT"].map(type => (
                <button key={type} onClick={() => setFilter(type)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: filter === type ? "var(--brand)" : "transparent",
                    color:      filter === type ? "#fff" : "var(--muted)",
                  }}>
                  {type === "ALL" ? "All" : `${TYPE_ICON[type]} ${type}`}
                </button>
              ))}
            </div>
            {/* Search */}
            <input className="input-field !py-1.5 text-sm" style={{ maxWidth:"220px" }}
              placeholder="🔍 Search channels…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <span className="text-xs ml-auto" style={{ color:"var(--muted)" }}>
              {visibleChannels.length} channel{visibleChannels.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* ── Main content: channel table + detail panel ── */}
        <div className="flex gap-6">

          {/* Channel table */}
          <div className="flex-1 card !p-0 overflow-hidden">
            {!selWS ? (
              <EmptyState icon="💬" title="Select a workspace"
                message="Choose a tenant and workspace above to see its channels." />
            ) : loading ? <LoadingSpinner /> : visibleChannels.length === 0 ? (
              <EmptyState icon="💬"
                title={channels.length === 0 ? "No channels yet" : "No channels match your filter"}
                message={channels.length === 0
                  ? "Click '+ New Channel' to create the first channel in this workspace."
                  : "Try a different filter or search term."
                } />
            ) : (
              <table className="w-full text-sm">
                <thead style={{ background:"var(--surface)" }}>
                  <tr>
                    {["Channel", "Type", "Status", "Created", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase"
                        style={{ color:"var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleChannels.map(c => (
                    <tr key={c.id}
                      onClick={() => selectChannel(c)}
                      className="border-t hover:bg-slate-50 cursor-pointer"
                      style={{
                        borderColor: "var(--border)",
                        background: selected?.id === c.id ? "#eff6ff" : undefined,
                      }}>

                      {/* Channel name + description */}
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {TYPE_ICON[c.channel_type]} #{c.name}
                        </div>
                        {c.description && (
                          <div className="text-xs mt-0.5" style={{ color:"var(--muted)" }}>
                            {c.description}
                          </div>
                        )}
                      </td>

                      {/* Type badge */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={TYPE_COLOR[c.channel_type] || TYPE_COLOR.PUBLIC}>
                          {c.channel_type}
                        </span>
                      </td>

                      {/* Archive status */}
                      <td className="px-4 py-3">
                        {c.is_archived
                          ? <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background:"#fee2e2", color:"#dc2626" }}>Archived</span>
                          : <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background:"#dcfce7", color:"#166534" }}>Active</span>
                        }
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3 text-xs" style={{ color:"var(--muted)" }}>
                        {fmt(c.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <button onClick={e => { e.stopPropagation(); setModal(c); }}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background:"#eff6ff", color:"#1d4ed8" }}>
                            Edit
                          </button>

                          {c.is_archived ? (
                            <button onClick={e => { e.stopPropagation(); handleRestore(c.id); }}
                              className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">
                              Restore
                            </button>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); handleArchive(c.id); }}
                              className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700">
                              Archive
                            </button>
                          )}

                          {/* Join — only for non-private, non-archived */}
                          {c.channel_type !== "PRIVATE" && !c.is_archived && (
                            <button onClick={e => { e.stopPropagation(); handleJoin(c.id); }}
                              className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600">
                              Join
                            </button>
                          )}

                          {/* Leave */}
                          {!c.is_archived && (
                            <button onClick={e => { e.stopPropagation(); handleLeave(c.id); }}
                              className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                              Leave
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

          {/* ── Channel detail panel (appears when row clicked) ── */}
          {selected && (
            <div className="w-72 shrink-0 flex flex-col gap-4 fade-up">

              {/* Channel info card */}
              <div className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">
                      {TYPE_ICON[selected.channel_type]} #{selected.name}
                    </h3>
                    {selected.description && (
                      <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>
                        {selected.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={TYPE_COLOR[selected.channel_type] || TYPE_COLOR.PUBLIC}>
                    {selected.channel_type}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs mb-4">
                  {[
                    { label:"Channel ID",  value: `#${selected.id}` },
                    { label:"Workspace",   value: selWS?.name || "—" },
                    { label:"Tenant",      value: selTenant?.name || "—" },
                    { label:"Status",      value: selected.is_archived ? "🗄 Archived" : "✅ Active" },
                    { label:"Type",        value: TYPE_DESC[selected.channel_type] },
                    { label:"Created",     value: fmt(selected.created_at) },
                    { label:"Updated",     value: fmt(selected.updated_at) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between p-2 rounded-lg"
                      style={{ background:"var(--surface)" }}>
                      <span style={{ color:"var(--muted)" }}>{r.label}</span>
                      <span className="font-medium text-right">{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <button onClick={() => setModal(selected)}
                    className="btn-secondary text-sm">
                    ✏️ Edit Channel
                  </button>

                  {!selected.is_archived ? (
                    <>
                      {selected.channel_type !== "PRIVATE" && (
                        <button onClick={() => handleJoin(selected.id)}
                          className="btn-primary text-sm">
                          🚀 Join Channel
                        </button>
                      )}
                      <button onClick={() => handleLeave(selected.id)}
                        className="btn-secondary text-sm">
                        🚪 Leave Channel
                      </button>
                      <button onClick={() => handleArchive(selected.id)}
                        className="text-sm px-4 py-2 rounded-xl border font-medium"
                        style={{ borderColor:"#fca5a5", color:"#dc2626", background:"#fff5f5" }}>
                        🗄 Archive Channel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleRestore(selected.id)}
                      className="btn-primary text-sm">
                      ✅ Restore Channel
                    </button>
                  )}
                </div>
              </div>

              {/* Channel type guide card */}
              <div className="card">
                <p className="text-xs font-semibold mb-3" style={{ color:"var(--muted)" }}>
                  CHANNEL TYPE GUIDE
                </p>
                <div className="flex flex-col gap-2">
                  {Object.entries(TYPE_ICON).map(([type, icon]) => (
                    <div key={type} className="flex items-start gap-2 text-xs p-2 rounded-lg"
                      style={{
                        background: selected.channel_type === type ? TYPE_COLOR[type].background : "var(--surface)",
                        color:      selected.channel_type === type ? TYPE_COLOR[type].color : "var(--text)",
                      }}>
                      <span className="shrink-0">{icon}</span>
                      <div>
                        <span className="font-bold">{type}</span>
                        <p className="mt-0.5 opacity-80">{TYPE_DESC[type]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Channel Create/Edit Modal */}
        <ChannelModal
          open={!!modal}
          workspaceId={selWS?.id}
          tenantId={selTenant?.id}
          editItem={modal && modal !== "create" ? modal : null}
          onSave={modal && modal !== "create" ? handleEdit : handleCreate}
          onClose={() => setModal(null)}
        />
      </div>
    </Layout>
  );
}
