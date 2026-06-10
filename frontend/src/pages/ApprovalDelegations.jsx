// pages/ApprovalDelegations.jsx — Phase 8: Approval Delegation Management
import { useState, useEffect } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const fmt = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const isNowActive = d => d.is_active && new Date(d.start_date)<=new Date() && new Date(d.end_date)>=new Date();

// ── Create Delegation Modal ───────────────────────────────
function DelegateModal({ open, users, onSave, onClose }) {
  const [form, setForm] = useState({delegatee_id:"",start_date:"",end_date:"",reason:""});
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{ setForm({delegatee_id:"",start_date:"",end_date:"",reason:""}); setErr(""); },[open]);

  const handleSave = async () => {
    if (!form.delegatee_id || !form.start_date || !form.end_date || !form.reason.trim()) {
      setErr("All fields are required"); return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setErr("End date must be after start date"); return;
    }
    setSaving(true); setErr("");
    try {
      await onSave({...form, delegatee_id:parseInt(form.delegatee_id),
        start_date: new Date(form.start_date).toISOString(),
        end_date:   new Date(form.end_date).toISOString()});
    } catch (e) { setErr(e.response?.data?.detail || "Failed to create delegation"); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.45)"}}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
        <h3 className="font-semibold text-lg mb-5">Create Approval Delegation</h3>
        <ErrorMessage message={err} />
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>Delegate To *</label>
            <select className="input-field" value={form.delegatee_id}
                    onChange={e=>f("delegatee_id",e.target.value)}>
              <option value="">— Select user —</option>
              {users.filter(u=>["admin","manager"].includes(u.role)).map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>Start Date *</label>
              <input type="datetime-local" className="input-field" value={form.start_date}
                     onChange={e=>f("start_date",e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>End Date *</label>
              <input type="datetime-local" className="input-field" value={form.end_date}
                     onChange={e=>f("end_date",e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>Reason *</label>
            <textarea className="input-field !h-24 resize-none"
                      placeholder="e.g. On leave from May 20 to May 25…"
                      value={form.reason} onChange={e=>f("reason",e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto px-6">
            {saving?"Creating…":"Create Delegation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function ApprovalDelegations() {
  const { user }  = useAuth();
  const [myDels, setMyDels]         = useState([]);
  const [activeDels, setActiveDels] = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [tab, setTab]               = useState("my");
  const [showModal, setShowModal]   = useState(false);
  const [cancelId, setCancelId]     = useState(null);

  const load = () => Promise.all([
    api.get("/approval-delegations/me"),
    api.get("/approval-delegations/active"),
    api.get("/users/"),
  ]).then(([m,a,u])=>{ setMyDels(m.data); setActiveDels(a.data); setUsers(u.data||[]); })
    .catch(()=>setError("Failed to load"))
    .finally(()=>setLoading(false));

  useEffect(()=>{ load(); },[]);

  const displayed = tab==="my" ? myDels : activeDels;

  const handleCreate = async (form) => {
    const { data } = await api.post("/approval-delegations", form);
    setMyDels(p=>[data,...p]); setShowModal(false);
    await api.get("/approval-delegations/active").then(r=>setActiveDels(r.data));
  };

  const handleCancel = async () => {
    await api.put(`/approval-delegations/${cancelId}/cancel`);
    setMyDels(p=>p.map(d=>d.id===cancelId?{...d,is_active:false}:d));
    setActiveDels(p=>p.filter(d=>d.id!==cancelId));
    setCancelId(null);
  };

  return (
    <Layout>
      <div className="fade-up max-w-6xl">
        <PageHeader title="Approval Delegations"
          subtitle="Delegate approval rights to another user when unavailable"
          action={user?.role!=="employee" && (
            <button className="btn-primary !w-auto px-5" onClick={()=>setShowModal(true)}>+ New Delegation</button>
          )} />
        <ErrorMessage message={error} />

        {/* Info banner */}
        <div className="mb-5 p-3 rounded-xl text-sm"
             style={{background:"#eff6ff",color:"#1d4ed8",border:"1px solid #bfdbfe"}}>
          💡 <strong>Example:</strong> Manager on leave May 20–25 → Delegate approvals to another manager so they don't block.
        </div>

        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{background:"var(--surface)"}}>
          {[{k:"my",l:"My Delegations"},{k:"active",l:"Currently Active"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
                    className="px-5 text-sm py-2 rounded-lg font-medium"
                    style={{background:tab===t.k?"white":"transparent",
                            color:tab===t.k?"var(--brand)":"var(--muted)"}}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="card !p-0 overflow-hidden">
          {loading ? <LoadingSpinner /> : displayed.length===0 ? (
            <EmptyState icon="🤝" title="No delegations found"
              message="Create a delegation to assign your approval rights temporarily." />
          ) : (
            <table className="w-full text-sm">
              <thead style={{background:"var(--surface)"}}>
                <tr>{["Delegator","Delegatee","Start Date","End Date","Reason","Status","Actions"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{color:"var(--muted)"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {displayed.map(d=>(
                  <tr key={d.id} className="border-t hover:bg-slate-50" style={{borderColor:"var(--border)"}}>
                    <td className="px-4 py-3 text-xs font-medium">
                      {d.delegator?.name || `User #${d.delegator_id}`}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {d.delegatee?.name || `User #${d.delegatee_id}`}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}>{fmt(d.start_date)}</td>
                    <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}>{fmt(d.end_date)}</td>
                    <td className="px-4 py-3 text-xs max-w-40 truncate" title={d.reason}>{d.reason}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={isNowActive(d)?"active":d.is_active?"pending":"cancelled"} />
                    </td>
                    <td className="px-4 py-3">
                      {d.is_active && d.delegator_id===user?.id && (
                        <button onClick={()=>setCancelId(d.id)}
                                className="text-xs px-2 py-1 rounded bg-red-50 text-red-600">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DelegateModal open={showModal} users={users}
          onSave={handleCreate} onClose={()=>setShowModal(false)} />
        <ConfirmModal open={!!cancelId} title="Cancel Delegation"
          message="Are you sure you want to cancel this delegation?"
          onConfirm={handleCancel} onCancel={()=>setCancelId(null)} />
      </div>
    </Layout>
  );
}
