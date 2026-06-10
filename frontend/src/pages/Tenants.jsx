// pages/Tenants.jsx — Phase 10A Module 1: Tenant Management (Full)
// Features: Create, Edit, View, List, Suspend, Activate, Search, Filter by status
import { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ── Helpers ───────────────────────────────────────────────────
const STATUS_STYLE = {
  ACTIVE:    { background:"#dcfce7", color:"#166534" },
  SUSPENDED: { background:"#fee2e2", color:"#dc2626" },
  TRIAL:     { background:"#fef3c7", color:"#92400e" },
  CANCELLED: { background:"#f3f4f6", color:"#6b7280" },
};
const fmt = d =>
  d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

const INDUSTRIES = [
  "Technology","IT Services","Software Development","SaaS","E-Commerce",
  "Healthcare","Finance","Education","Manufacturing","Retail","Other",
];

// ─────────────────────────────────────────────────────────────
// CREATE / EDIT TENANT MODAL
// ─────────────────────────────────────────────────────────────
function TenantModal({ open, initial, onSave, onClose }) {
  const blank = { name:"", contact_email:"", phone:"", address:"", industry:"", slug:"" };
  const [form,   setForm]   = useState(blank);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setForm(initial
      ? { name: initial.name, contact_email: initial.contact_email,
          phone: initial.phone || "", address: initial.address || "",
          industry: initial.industry || "", slug: initial.slug || "" }
      : blank
    );
  }, [open, initial]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim())          { setErr("Organization name is required"); return; }
    if (!form.contact_email.trim()) { setErr("Contact email is required");     return; }
    setSaving(true); setErr("");
    try   { await onSave(form); }
    catch (e) { setErr(e.response?.data?.detail || "Save failed"); }
    finally   { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background:"rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4"
           style={{ maxHeight:"90vh", overflowY:"auto" }}>
        <h3 className="font-semibold text-lg mb-1">
          {initial ? "Edit Tenant" : "Create Tenant"}
        </h3>
        <p className="text-xs mb-4" style={{ color:"var(--muted)" }}>
          {initial
            ? "Update the organization details below."
            : "Fill in the details to register a new tenant organization on the platform."}
        </p>
        <ErrorMessage message={err} />

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Organization Name — full width */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Organization Name *
            </label>
            <input className="input-field" value={form.name}
              placeholder="e.g. Acme Technologies Pvt Ltd"
              onChange={e => set("name", e.target.value)} />
          </div>

          {/* Contact Email — full width */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Contact Email *
            </label>
            <input className="input-field" type="email" value={form.contact_email}
              placeholder="e.g. ceo@acme.com"
              onChange={e => set("contact_email", e.target.value)} />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Phone
            </label>
            <input className="input-field" value={form.phone}
              placeholder="e.g. +91-9876543210"
              onChange={e => set("phone", e.target.value)} />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Industry
            </label>
            <select className="input-field" value={form.industry}
              onChange={e => set("industry", e.target.value)}>
              <option value="">— Select Industry —</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* Address — full width */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Address
            </label>
            <input className="input-field" value={form.address}
              placeholder="e.g. 12, MG Road, Bangalore, Karnataka"
              onChange={e => set("address", e.target.value)} />
          </div>

          {/* Slug — full width, auto-generated if blank */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
              Slug{" "}
              <span className="text-xs font-normal" style={{ color:"var(--muted)" }}>
                (auto-generated from name if left blank)
              </span>
            </label>
            <input className="input-field font-mono" value={form.slug}
              placeholder="e.g. acme-technologies (leave blank to auto-generate)"
              onChange={e => set("slug", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto px-6">
            {saving ? "Saving…" : initial ? "Update Tenant" : "Save Tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function Tenants() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [tenants,   setTenants]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [selected,  setSelected]  = useState(null);
  const [modal,     setModal]     = useState(null);   // null | "create" | tenant object
  const [suspendId, setSuspendId] = useState(null);
  const [cancelId,  setCancelId]  = useState(null);

  // Search & filter
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // ── Load tenants ──────────────────────────────────────────
  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/tenants");
      setTenants(data || []);
    } catch { setError("Failed to load tenants"); }
    finally  { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // ── Access guard ──────────────────────────────────────────
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

  // ── Filtered + searched list ──────────────────────────────
  const filtered = useMemo(() => {
    let list = [...tenants];
    if (filterStatus !== "ALL") list = list.filter(t => t.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.contact_email.toLowerCase().includes(q) ||
        (t.industry || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [tenants, filterStatus, search]);

  // ── Status counts for filter badges ──────────────────────
  const counts = useMemo(() => ({
    ALL:       tenants.length,
    ACTIVE:    tenants.filter(t => t.status === "ACTIVE").length,
    TRIAL:     tenants.filter(t => t.status === "TRIAL").length,
    SUSPENDED: tenants.filter(t => t.status === "SUSPENDED").length,
    CANCELLED: tenants.filter(t => t.status === "CANCELLED").length,
  }), [tenants]);

  // ── CRUD handlers ─────────────────────────────────────────
  const handleCreate = async (form) => {
    const { data } = await api.post("/tenants", form);
    setTenants(p => [data, ...p]);
    setModal(null);
  };

  const handleEdit = async (form) => {
    const { data } = await api.put(`/tenants/${modal.id}`, form);
    setTenants(p => p.map(t => t.id === modal.id ? data : t));
    setSelected(data);
    setModal(null);
  };

  const handleSuspend = async () => {
    const { data } = await api.patch(`/tenants/${suspendId}/suspend`);
    setTenants(p => p.map(t => t.id === suspendId ? data : t));
    if (selected?.id === suspendId) setSelected(data);
    setSuspendId(null);
  };

  const handleActivate = async (id) => {
    const { data } = await api.patch(`/tenants/${id}/activate`);
    setTenants(p => p.map(t => t.id === id ? data : t));
    if (selected?.id === id) setSelected(data);
  };

  // View fresh tenant detail from API
  const handleViewDetail = async (t) => {
    setSelected(t);
    try {
      const { data } = await api.get(`/tenants/${t.id}`);
      setSelected(data);
    } catch { /* use cached version */ }
  };

  return (
    <Layout>
      <div className="fade-up max-w-7xl">
        <PageHeader
          title="Tenant Management"
          subtitle="Manage SaaS organizations and their access"
          action={
            <button className="btn-primary !w-auto px-5" onClick={() => setModal("create")}>
              + New Tenant
            </button>
          }
        />
        <ErrorMessage message={error} />

        {/* ── Search + Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search box */}
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color:"var(--muted)" }}>🔍</span>
            <input
              className="input-field !pl-8"
              placeholder="Search by name, slug, email, industry…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {["ALL","ACTIVE","TRIAL","SUSPENDED","CANCELLED"].map(s => (
              <button key={s}
                onClick={() => setFilterStatus(s)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={{
                  background: filterStatus === s
                    ? (s === "ALL" ? "var(--brand)" : STATUS_STYLE[s]?.background || "#e5e7eb")
                    : "var(--surface)",
                  color: filterStatus === s
                    ? (s === "ALL" ? "#fff" : STATUS_STYLE[s]?.color || "#374151")
                    : "var(--muted)",
                  border: `1px solid ${filterStatus === s ? "transparent" : "var(--border)"}`,
                }}>
                {s} {counts[s] !== undefined ? `(${counts[s]})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-5">

          {/* ── Tenant Table ── */}
          <div className="flex-1 card !p-0 overflow-hidden">
            {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
              <EmptyState icon="🏢" title="No tenants found"
                message={search || filterStatus !== "ALL"
                  ? "Try clearing your search or filter."
                  : "Click '+ New Tenant' to register the first organization."} />
            ) : (
              <table className="w-full text-sm">
                <thead style={{ background:"var(--surface)" }}>
                  <tr>
                    {["Name","Slug","Email","Industry","Status","Created","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase"
                          style={{ color:"var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}
                      onClick={() => handleViewDetail(t)}
                      className="border-t hover:bg-slate-50 cursor-pointer"
                      style={{
                        borderColor: "var(--border)",
                        background: selected?.id === t.id ? "#eff6ff" : undefined,
                      }}>
                      <td className="px-4 py-3 font-semibold">{t.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                              style={{ background:"#f1f5f9", color:"#1d4ed8" }}>
                          {t.slug}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color:"var(--muted)" }}>
                        {t.contact_email}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{t.industry || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={STATUS_STYLE[t.status] || STATUS_STYLE.TRIAL}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color:"var(--muted)" }}>
                        {fmt(t.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          {/* Edit */}
                          <button
                            onClick={() => setModal(t)}
                            className="text-xs px-2 py-1 rounded font-medium"
                            style={{ background:"#eff6ff", color:"#1d4ed8" }}>
                            Edit
                          </button>

                          {/* Suspend / Activate */}
                          {t.status === "SUSPENDED" ? (
                            <button
                              onClick={() => handleActivate(t.id)}
                              className="text-xs px-2 py-1 rounded font-medium bg-green-50 text-green-700">
                              Activate
                            </button>
                          ) : t.status !== "CANCELLED" ? (
                            <button
                              onClick={() => setSuspendId(t.id)}
                              className="text-xs px-2 py-1 rounded font-medium bg-red-50 text-red-600">
                              Suspend
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Table footer — showing count */}
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-2 border-t text-xs" style={{ borderColor:"var(--border)", color:"var(--muted)" }}>
                Showing {filtered.length} of {tenants.length} tenant{tenants.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* ── Detail Panel ── */}
          {selected && (
            <div className="w-72 shrink-0 card fade-up" style={{ alignSelf:"flex-start" }}>

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base leading-tight">{selected.name}</h3>
                  <p className="font-mono text-xs mt-0.5" style={{ color:"var(--muted)" }}>
                    {selected.slug}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
                      style={STATUS_STYLE[selected.status] || STATUS_STYLE.TRIAL}>
                  {selected.status}
                </span>
              </div>

              {/* Info rows */}
              <div className="flex flex-col gap-2.5 text-xs border-t pt-3 mb-3"
                   style={{ borderColor:"var(--border)" }}>
                {[
                  { label:"Email",    value: selected.contact_email },
                  { label:"Phone",    value: selected.phone || "—"  },
                  { label:"Industry", value: selected.industry || "—" },
                  { label:"Created",  value: fmt(selected.created_at) },
                  { label:"Updated",  value: fmt(selected.updated_at) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between gap-2">
                    <span style={{ color:"var(--muted)" }}>{r.label}</span>
                    <span className="font-medium text-right">{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Address */}
              {selected.address && (
                <p className="text-xs px-3 py-2 rounded-lg mb-3"
                   style={{ background:"var(--surface)", color:"var(--muted)" }}>
                  📍 {selected.address}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <button onClick={() => setModal(selected)} className="btn-secondary text-sm">
                  ✏️ Edit Tenant
                </button>

                {selected.status === "SUSPENDED" ? (
                  <button
                    onClick={() => handleActivate(selected.id)}
                    className="text-sm font-medium py-2 rounded-xl"
                    style={{ background:"#dcfce7", color:"#166534" }}>
                    ✅ Activate Tenant
                  </button>
                ) : selected.status !== "CANCELLED" ? (
                  <button
                    onClick={() => setSuspendId(selected.id)}
                    className="text-sm font-medium py-2 rounded-xl"
                    style={{ background:"#fee2e2", color:"#dc2626" }}>
                    ⛔ Suspend Tenant
                  </button>
                ) : null}

                {/* Quick links */}
                <div className="border-t pt-2 mt-1" style={{ borderColor:"var(--border)" }}>
                  <p className="text-xs font-medium mb-2" style={{ color:"var(--muted)" }}>
                    QUICK LINKS
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => navigate("/workspaces")}
                      className="text-xs text-left px-3 py-1.5 rounded-lg hover:bg-slate-50"
                      style={{ color:"var(--brand)" }}>
                      🗂 View Workspaces →
                    </button>
                    <button
                      onClick={() => navigate("/tenants/onboarding")}
                      className="text-xs text-left px-3 py-1.5 rounded-lg hover:bg-slate-50"
                      style={{ color:"var(--brand)" }}>
                      🚀 Onboarding Status →
                    </button>
                    <button
                      onClick={() => navigate("/channels")}
                      className="text-xs text-left px-3 py-1.5 rounded-lg hover:bg-slate-50"
                      style={{ color:"var(--brand)" }}>
                      💬 View Channels →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Modals ── */}
        <TenantModal
          open={!!modal}
          initial={modal === "create" ? null : modal}
          onSave={modal === "create" ? handleCreate : handleEdit}
          onClose={() => setModal(null)}
        />

        <ConfirmModal
          open={!!suspendId}
          title="Suspend Tenant"
          message="This will block all users of this tenant from accessing the platform. You can re-activate it anytime. Continue?"
          onConfirm={handleSuspend}
          onCancel={() => setSuspendId(null)}
        />
      </div>
    </Layout>
  );
}
