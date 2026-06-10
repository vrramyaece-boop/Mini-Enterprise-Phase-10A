// pages/SLARules.jsx — Phase 8 Spec compliant
// Features: View / Create / Edit / Disable / Filter by module / Filter by priority
// Columns: Rule ID / Module / Priority / Allowed Hours / Escalation Enabled / Escalation After / Status / Actions
// Form fields: Module(dropdown) / Priority(dropdown) / Allowed Hours / Escalation Enabled(toggle) / Escalation After / Is Active(toggle)
import { useState, useEffect } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import FilterBar, { FilterSelect } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import ToggleSwitch from "../components/ToggleSwitch";
import { useAuth } from "../context/AuthContext";

const BLANK = { module_name:"", priority:"", allowed_hours:24,
                escalation_enabled:false, escalation_after_hours:0, is_active:true };

// ── Create / Edit Modal ──────────────────────────────────────
function RuleModal({ open, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || BLANK);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { setForm(initial || BLANK); setErr(""); }, [open, initial]);

  const validate = () => {
    if (!form.module_name) return "Module name must be selected";
    if (!form.priority)    return "Priority must be selected";
    if (!form.allowed_hours || form.allowed_hours <= 0)
      return "Allowed hours must be greater than 0";
    if (form.escalation_enabled && (!form.escalation_after_hours || form.escalation_after_hours <= 0))
      return "Escalation hours must be greater than 0";
    return "";
  };

  const handleSave = async () => {
    const ve = validate(); if (ve) { setErr(ve); return; }
    setSaving(true); setErr("");
    try { await onSave(form); }
    catch (e) { setErr(e.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{background:"rgba(0,0,0,0.45)"}}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
        <h3 className="font-semibold text-lg mb-5">
          {initial ? "Edit SLA Rule" : "Create SLA Rule"}
        </h3>
        <ErrorMessage message={err} />

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Module Name — Dropdown */}
          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{color:"var(--muted)"}}>Module Name *</label>
            <select className="input-field" value={form.module_name}
                    onChange={e => f("module_name", e.target.value)}>
              <option value="">— Select Module —</option>
              <option value="task">Task</option>
              <option value="approval">Approval</option>
            </select>
          </div>

          {/* Priority — Dropdown */}
          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{color:"var(--muted)"}}>Priority *</label>
            <select className="input-field" value={form.priority}
                    onChange={e => f("priority", e.target.value)}>
              <option value="">— Select Priority —</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Allowed Hours — Number input */}
          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{color:"var(--muted)"}}>Allowed Hours *</label>
            <input className="input-field" type="number" min="1"
                   value={form.allowed_hours}
                   onChange={e => f("allowed_hours", parseInt(e.target.value) || 0)} />
            <p className="text-xs mt-1" style={{color:"var(--muted)"}}>
              e.g. 24 = 1 day, 720 = 30 days
            </p>
          </div>

          {/* Escalation After Hours — Number input */}
          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{color:"var(--muted)"}}>Escalation After Hours</label>
            <input className="input-field" type="number" min="0"
                   value={form.escalation_after_hours}
                   disabled={!form.escalation_enabled}
                   style={{opacity: form.escalation_enabled ? 1 : 0.5}}
                   onChange={e => f("escalation_after_hours", parseInt(e.target.value) || 0)} />
          </div>
        </div>

        {/* Toggles */}
        <div className="border rounded-xl px-4 py-1 mb-5"
             style={{borderColor:"var(--border)"}}>
          {/* Escalation Enabled — Toggle */}
          <ToggleSwitch
            label="Escalation Enabled"
            description="Auto-escalate when SLA is approaching breach"
            checked={form.escalation_enabled}
            onChange={v => f("escalation_enabled", v)} />
          {/* Is Active — Toggle (only on edit) */}
          {initial && (
            <ToggleSwitch
              label="Is Active"
              description="Disable to stop this rule applying to new records"
              checked={form.is_active}
              onChange={v => f("is_active", v)} />
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving}
                  className="btn-primary !w-auto px-6">
            {saving ? "Saving…" : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function SLARules() {
  const { user }  = useAuth();
  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [modal, setModal]     = useState(null);    // null | "create" | rule object
  const [confirm, setConfirm] = useState(null);   // rule id to disable
  const [fMod, setFMod]       = useState("all");
  const [fPri, setFPri]       = useState("all");
  const [fixing, setFixing]   = useState(false);
  const [fixMsg, setFixMsg]   = useState("");

  const load = () =>
    api.get("/sla-rules")
       .then(r => setRules(r.data))
       .catch(() => setError("Failed to load SLA rules"))
       .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (user?.role !== "admin") return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="font-display text-2xl">Admin Access Required</h2>
        <p className="text-sm mt-2" style={{color:"var(--muted)"}}>
          SLA Rules management is available to Admins only.
        </p>
      </div>
    </Layout>
  );

  const displayed = rules.filter(r =>
    (fMod === "all" || r.module_name === fMod) &&
    (fPri === "all" || r.priority    === fPri)
  );

  const handleCreate = async (form) => {
    const { data } = await api.post("/sla-rules", form);
    setRules(p => [...p, data]); setModal(null);
  };
  const handleEdit = async (form) => {
    const { data } = await api.put(`/sla-rules/${modal.id}`, form);
    setRules(p => p.map(r => r.id === modal.id ? data : r)); setModal(null);
  };
  const handleDisable = async () => {
    await api.delete(`/sla-rules/${confirm}`);
    setRules(p => p.map(r => r.id === confirm ? { ...r, is_active:false } : r));
    setConfirm(null);
  };
  const handleQuickFix = async () => {
    setFixing(true); setFixMsg("");
    const short = rules.filter(r => r.is_active && r.allowed_hours < 24);
    if (short.length === 0) {
      setFixMsg("✅ All rules already have 24h+"); setFixing(false); return;
    }
    try {
      await Promise.all(short.map(r => api.put(`/sla-rules/${r.id}`, { allowed_hours: 720 })));
      load();
      setFixMsg(`✅ Updated ${short.length} rule(s) to 720h (30 days)`);
      setTimeout(() => setFixMsg(""), 5000);
    } catch (e) { setFixMsg("❌ " + (e.response?.data?.detail || e.message)); }
    finally { setFixing(false); }
  };

  return (
    <Layout>
      <div className="fade-up max-w-6xl">
        <PageHeader
          title="SLA Rules"
          subtitle="Define time limits for tasks and approvals based on priority"
          action={
            <div className="flex gap-2 items-center flex-wrap">
              {fixMsg && (
                <span className={`text-xs font-medium ${fixMsg.startsWith("✅")?"text-green-600":"text-red-600"}`}>
                  {fixMsg}
                </span>
              )}
              <button onClick={handleQuickFix} disabled={fixing}
                      className="btn-secondary !w-auto px-3 text-sm"
                      title="Set all short-hour rules to 720h">
                {fixing ? "Fixing…" : "🔧 Fix Short Rules"}
              </button>
              <button className="btn-primary !w-auto px-5"
                      onClick={() => setModal("create")}>
                + New SLA Rule
              </button>
            </div>
          } />

        <ErrorMessage message={error} />

        {/* Example info banner */}
        <div className="mb-4 p-3 rounded-xl text-xs"
             style={{background:"#f0fdf4",color:"#166534",border:"1px solid #86efac"}}>
          <strong>Examples:</strong> High priority task → completed within 24h. Approval request → completed within 12h.
          Use 720h (30 days) for rules where you want Active SLA records to persist.
        </div>

        {/* Filter dropdowns */}
        <FilterBar>
          <FilterSelect
            label="Filter by Module"
            value={fMod} onChange={setFMod}
            options={[
              {value:"all",      label:"All Modules"},
              {value:"task",     label:"Task"},
              {value:"approval", label:"Approval"},
            ]} />
          <FilterSelect
            label="Filter by Priority"
            value={fPri} onChange={setFPri}
            options={[
              {value:"all",    label:"All Priorities"},
              {value:"high",   label:"High"},
              {value:"medium", label:"Medium"},
              {value:"low",    label:"Low"},
            ]} />
        </FilterBar>

        {/* Table — spec columns: Rule ID / Module / Priority / Allowed Hours / Escalation Enabled / Escalation After / Status / Actions */}
        <div className="card !p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : displayed.length === 0 ? (
            <EmptyState icon="⏱" title="No SLA rules found"
              message='Click "+ New SLA Rule" to create one. Example: Task / High / 24h.' />
          ) : (
            <table className="w-full text-sm">
              <thead style={{background:"var(--surface)"}}>
                <tr>
                  {["Rule ID","Module","Priority","Allowed Hours",
                    "Escalation Enabled","Escalation After","Status","Actions"].map(h => (
                    <th key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                        style={{color:"var(--muted)"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => (
                  <tr key={r.id}
                      className="border-t hover:bg-slate-50"
                      style={{borderColor:"var(--border)"}}>
                    {/* Rule ID */}
                    <td className="px-4 py-3 font-mono text-xs"
                        style={{color:"var(--muted)"}}># {r.id}</td>
                    {/* Module */}
                    <td className="px-4 py-3 font-medium capitalize">{r.module_name}</td>
                    {/* Priority */}
                    <td className="px-4 py-3"><StatusBadge status={r.priority} /></td>
                    {/* Allowed Hours */}
                    <td className="px-4 py-3 font-mono">
                      {r.allowed_hours}h
                      {r.allowed_hours < 24 && r.is_active && (
                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded font-medium"
                              style={{background:"#fef3c7",color:"#92400e"}}>
                          ⚠️ short
                        </span>
                      )}
                    </td>
                    {/* Escalation Enabled */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.escalation_enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {r.escalation_enabled ? "Yes" : "No"}
                      </span>
                    </td>
                    {/* Escalation After */}
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.escalation_enabled ? `${r.escalation_after_hours}h` : "—"}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={r.is_active ? "active" : "cancelled"} />
                    </td>
                    {/* Actions: Edit / Disable */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setModal(r)}
                                className="text-xs px-3 py-1 rounded font-medium"
                                style={{background:"var(--brand-50)",color:"var(--brand)"}}>
                          Edit
                        </button>
                        {r.is_active && (
                          <button onClick={() => setConfirm(r.id)}
                                  className="text-xs px-3 py-1 rounded font-medium bg-red-50 text-red-600">
                            Disable
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

        {/* Create / Edit modal */}
        <RuleModal
          open={!!modal}
          initial={modal === "create" ? null : modal}
          onSave={modal === "create" ? handleCreate : handleEdit}
          onClose={() => setModal(null)} />

        {/* Disable confirmation */}
        <ConfirmModal
          open={!!confirm}
          title="Disable SLA Rule"
          message="This rule will be disabled. Existing tracking records are not affected."
          onConfirm={handleDisable}
          onCancel={() => setConfirm(null)} />
      </div>
    </Layout>
  );
}
