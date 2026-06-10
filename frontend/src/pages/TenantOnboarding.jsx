// pages/TenantOnboarding.jsx — Phase 10A Module 2: Tenant Onboarding
// Fixes:
//   1. admin_email and admin_password no longer autofill from browser saved passwords
//   2. All form fields reset cleanly after successful onboard
//   3. Result panel shows full onboarding details with tenant ID for status check
import { useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const statusStyle = {
  COMPLETED: { background:"#dcfce7", color:"#166534" },
  PENDING:   { background:"#fef3c7", color:"#92400e" },
  FAILED:    { background:"#fee2e2", color:"#dc2626" },
};

const fmt = d => d ? new Date(d).toLocaleString("en-IN") : "—";

// Blank form — defined outside component so it never inherits old state
const BLANK_FORM = {
  tenant_name:               "",
  contact_email:             "",
  industry:                  "",
  phone:                     "",
  admin_name:                "",
  admin_email:               "",
  admin_password:            "",
  create_default_workspace:  true,
};

export default function TenantOnboarding() {
  const { user }                    = useAuth();
  const [form,     setForm]         = useState({ ...BLANK_FORM });
  const [tenantId, setTenantId]     = useState("");
  const [status,   setStatus]       = useState(null);
  const [result,   setResult]       = useState(null);
  const [loading,  setLoading]      = useState(false);
  const [checking, setChecking]     = useState(false);
  const [error,    setError]        = useState("");
  const [success,  setSuccess]      = useState("");
  const [statusErr,setStatusErr]    = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

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

  // ── Onboard submit ──────────────────────────────────────────
  const handleOnboard = async () => {
    if (!form.tenant_name || !form.contact_email || !form.admin_name ||
        !form.admin_email  || !form.admin_password) {
      setError("Please fill all required fields marked with *");
      return;
    }
    setLoading(true); setError(""); setSuccess(""); setResult(null);
    try {
      const { data } = await api.post("/tenants/onboard", form);
      setResult(data);
      setSuccess("✅ Tenant onboarded successfully!");
      // Pre-fill the tenant ID in the status checker
      setTenantId(String(data.tenant?.id || ""));
      // Reset form for next onboarding
      setForm({ ...BLANK_FORM });
    } catch (e) {
      setError(e.response?.data?.detail || "Onboarding failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Check status ────────────────────────────────────────────
  const handleCheckStatus = async () => {
    if (!tenantId) { setStatusErr("Enter a tenant ID"); return; }
    setChecking(true); setStatusErr(""); setStatus(null);
    try {
      const { data } = await api.get(`/tenants/${tenantId}/onboarding-status`);
      setStatus(data);
    } catch (e) {
      setStatusErr(e.response?.data?.detail || "Tenant not found");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Layout>
      <div className="fade-up max-w-5xl">
        <PageHeader
          title="Tenant Onboarding"
          subtitle="Create a new tenant with first admin and default workspace in one step"
        />

        {error   && <ErrorMessage message={error} />}
        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium"
            style={{ background:"#f0fdf4", color:"#166534", border:"1px solid #86efac" }}>
            {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">

          {/* ── LEFT: Onboard Form ── */}
          <div className="card">
            <h3 className="font-semibold mb-5">🏢 Create Tenant + Admin</h3>

            {/* Tell the browser this is NOT a login form → prevents autofill */}
            {/* Fix 1: autoComplete="off" on the form wrapper div */}
            <div autoComplete="off" className="flex flex-col gap-4">

              {/* ── Tenant Details ── */}
              <div className="p-3 rounded-xl text-xs font-semibold"
                style={{ background:"#eff6ff", color:"#1d4ed8" }}>
                🏢 Tenant Details
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                  Organization Name *
                </label>
                <input className="input-field" autoComplete="off"
                  value={form.tenant_name} onChange={e => set("tenant_name", e.target.value)}
                  placeholder="e.g. Acme Technologies" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                  Contact Email *
                </label>
                <input className="input-field" type="email" autoComplete="off"
                  value={form.contact_email} onChange={e => set("contact_email", e.target.value)}
                  placeholder="e.g. info@acme.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                    Industry
                  </label>
                  <input className="input-field" autoComplete="off"
                    value={form.industry} onChange={e => set("industry", e.target.value)}
                    placeholder="e.g. Technology" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                    Phone
                  </label>
                  <input className="input-field" autoComplete="off"
                    value={form.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="e.g. +91-9000012345" />
                </div>
              </div>

              {/* ── First Admin User ── */}
              <div className="p-3 rounded-xl text-xs font-semibold mt-2"
                style={{ background:"#f5f3ff", color:"#7c3aed" }}>
                👤 First Admin User
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                  Admin Name *
                </label>
                <input className="input-field" autoComplete="off"
                  value={form.admin_name} onChange={e => set("admin_name", e.target.value)}
                  placeholder="e.g. John Smith" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                  Admin Email * &nbsp;
                  <span className="text-orange-500 font-normal">
                    (this is the tenant admin's email — not your own)
                  </span>
                </label>
                {/* Fix 1: autoComplete="new-password" tricks browsers into NOT autofilling */}
                <input className="input-field" type="email" autoComplete="new-password"
                  value={form.admin_email} onChange={e => set("admin_email", e.target.value)}
                  placeholder="e.g. admin@acme.com" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>
                  Admin Password *
                </label>
                {/* Fix 1: autoComplete="new-password" prevents password autofill */}
                <input className="input-field" type="password" autoComplete="new-password"
                  value={form.admin_password} onChange={e => set("admin_password", e.target.value)}
                  placeholder="Set a strong password for the tenant admin" />
              </div>

              {/* Default workspace toggle */}
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background:"var(--surface)" }}>
                <input type="checkbox" id="ws" className="w-4 h-4"
                  checked={form.create_default_workspace}
                  onChange={e => set("create_default_workspace", e.target.checked)} />
                <div>
                  <label htmlFor="ws" className="text-sm font-medium cursor-pointer">
                    Create default "General" workspace
                  </label>
                  <p className="text-xs mt-0.5" style={{ color:"var(--muted)" }}>
                    Automatically creates a General workspace for this tenant
                  </p>
                </div>
              </div>

              <button onClick={handleOnboard} disabled={loading} className="btn-primary">
                {loading ? "Onboarding…" : "🚀 Onboard Tenant"}
              </button>
            </div>
          </div>

          {/* ── RIGHT: Result + Status Check ── */}
          <div className="flex flex-col gap-5">

            {/* Onboarding result panel — shown after successful onboard */}
            {result ? (
              <div className="card">
                <h3 className="font-semibold mb-4">✅ Onboarding Result</h3>
                <div className="flex flex-col gap-2 text-sm">

                  {/* Tenant info */}
                  <div className="p-3 rounded-xl" style={{ background:"var(--surface)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>
                      TENANT CREATED
                    </p>
                    <div className="flex justify-between">
                      <span style={{ color:"var(--muted)" }}>Tenant ID</span>
                      <span className="font-bold text-blue-600">#{result.tenant?.id}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ color:"var(--muted)" }}>Name</span>
                      <span className="font-semibold">{result.tenant?.name}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ color:"var(--muted)" }}>Slug</span>
                      <span className="font-mono text-xs text-blue-600">{result.tenant?.slug}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ color:"var(--muted)" }}>Status</span>
                      <span className="font-bold px-2 py-0.5 rounded-full text-xs"
                        style={{ background:"#fef3c7", color:"#92400e" }}>
                        {result.tenant?.status}
                      </span>
                    </div>
                  </div>

                  {/* Onboarding status */}
                  <div className="p-3 rounded-xl" style={{ background:"var(--surface)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>
                      ONBOARDING STATUS
                    </p>
                    <div className="flex justify-between">
                      <span style={{ color:"var(--muted)" }}>Status</span>
                      <span className="font-bold px-2 py-0.5 rounded-full text-xs"
                        style={statusStyle[result.onboarding?.onboarding_status] || statusStyle.PENDING}>
                        {result.onboarding?.onboarding_status}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ color:"var(--muted)" }}>Settings Created</span>
                      <span>{result.onboarding?.settings_created ? "✅ Yes" : "❌ No"}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ color:"var(--muted)" }}>Default Workspace</span>
                      <span>{result.onboarding?.default_workspace_created ? "✅ Yes" : "❌ No"}</span>
                    </div>
                  </div>

                  {/* Workspace info */}
                  {result.workspace && (
                    <div className="p-3 rounded-xl" style={{ background:"var(--surface)" }}>
                      <p className="text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>
                        DEFAULT WORKSPACE
                      </p>
                      <div className="flex justify-between">
                        <span style={{ color:"var(--muted)" }}>Name</span>
                        <span className="font-semibold">{result.workspace.name}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span style={{ color:"var(--muted)" }}>Slug</span>
                        <span className="font-mono text-xs text-blue-600">{result.workspace.slug}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs p-2 rounded-lg text-center"
                    style={{ background:"#eff6ff", color:"#1d4ed8" }}>
                    💡 Tenant ID <strong>#{result.tenant?.id}</strong> has been pre-filled in the status checker below
                  </p>
                </div>
              </div>
            ) : (
              <div className="card text-center py-10">
                <p className="text-4xl mb-3">🏢</p>
                <p className="text-sm font-medium mb-1">No onboarding yet</p>
                <p className="text-xs" style={{ color:"var(--muted)" }}>
                  Fill the form and click <strong>Onboard Tenant</strong> to see results here.
                </p>
              </div>
            )}

            {/* Check onboarding status */}
            <div className="card">
              <h3 className="font-semibold mb-3">📋 Check Onboarding Status</h3>
              <p className="text-xs mb-3" style={{ color:"var(--muted)" }}>
                Enter a tenant ID to check if onboarding completed successfully.
              </p>
              <div className="flex gap-2 mb-3">
                <input className="input-field" placeholder="Tenant ID (e.g. 1)"
                  value={tenantId} onChange={e => setTenantId(e.target.value)}
                  type="number" min="1" />
                <button onClick={handleCheckStatus} disabled={checking}
                  className="btn-secondary !w-auto px-4 whitespace-nowrap">
                  {checking ? "Checking…" : "Check"}
                </button>
              </div>

              {statusErr && (
                <p className="text-xs text-red-500 mb-2">{statusErr}</p>
              )}

              {status && (
                <div className="flex flex-col gap-2 text-xs">
                  {[
                    { label:"Onboarding Status",  value:
                      <span className="font-bold px-2 py-0.5 rounded-full text-xs"
                        style={statusStyle[status.onboarding_status] || statusStyle.PENDING}>
                        {status.onboarding_status}
                      </span>
                    },
                    { label:"Settings Created",   value: status.settings_created ? "✅ Yes" : "❌ No" },
                    { label:"Default Workspace",  value: status.default_workspace_created ? "✅ Yes" : "❌ No" },
                    { label:"Completed At",        value: fmt(status.completed_at) },
                    { label:"Admin User ID",       value: status.admin_user_id ? `#${status.admin_user_id}` : "—" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between p-2 rounded-lg"
                      style={{ background:"var(--surface)" }}>
                      <span style={{ color:"var(--muted)" }}>{r.label}</span>
                      <span className="font-medium">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
