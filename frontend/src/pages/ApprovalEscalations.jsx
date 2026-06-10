// pages/ApprovalEscalations.jsx — Phase 8: Approval Escalation Management
import { useState, useEffect } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

const fmt = d => d ? new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";

function EscalateModal({ open, approvals, users, onSave, onClose }) {
  const [form, setForm] = useState({approval_id:"",escalated_to:"",reason:"",escalation_level:1});
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  useEffect(()=>{ setForm({approval_id:"",escalated_to:"",reason:"",escalation_level:1}); setErr(""); },[open]);

  const handleSave = async () => {
    if (!form.approval_id||!form.escalated_to||!form.reason.trim()) { setErr("All fields are required"); return; }
    setSaving(true); setErr("");
    try { await onSave({...form,approval_id:parseInt(form.approval_id),escalated_to:parseInt(form.escalated_to)}); }
    catch (e) { setErr(e.response?.data?.detail||"Escalation failed"); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.45)"}}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
        <h3 className="font-semibold text-lg mb-5">Escalate Approval</h3>
        <ErrorMessage message={err} />
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>Approval *</label>
            <select className="input-field" value={form.approval_id} onChange={e=>setForm(p=>({...p,approval_id:e.target.value}))}>
              <option value="">— Select pending approval —</option>
              {approvals.filter(a=>a.status==="pending").map(a=>(
                <option key={a.id} value={a.id}>#{a.id} — {a.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>Escalate To *</label>
            <select className="input-field" value={form.escalated_to} onChange={e=>setForm(p=>({...p,escalated_to:e.target.value}))}>
              <option value="">— Select user —</option>
              {users.filter(u=>["admin","manager"].includes(u.role)).map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>Escalation Level</label>
            <input className="input-field" type="number" min="1" max="5" value={form.escalation_level}
                   onChange={e=>setForm(p=>({...p,escalation_level:parseInt(e.target.value)||1}))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:"var(--muted)"}}>Reason *</label>
            <textarea className="input-field !h-24 resize-none" placeholder="Explain the escalation reason…"
                      value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="btn-secondary !w-auto px-5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto px-6">
            {saving?"Escalating…":"Escalate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalEscalations() {
  const { user }  = useAuth();
  const [escalations, setEscalations] = useState([]);
  const [approvals, setApprovals]     = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [tab, setTab]                 = useState("all");
  const [showModal, setShowModal]     = useState(false);
  const [resolveId, setResolveId]     = useState(null);
  const [cancelId, setCancelId]       = useState(null);

  const load = () => Promise.all([
    api.get("/approval-escalations"),
    api.get("/approvals/"),
    api.get("/users/"),
  ]).then(([e,a,u])=>{ setEscalations(e.data); setApprovals(a.data||[]); setUsers(u.data||[]); })
    .catch(()=>setError("Failed to load")).finally(()=>setLoading(false));
  useEffect(()=>{ load(); },[]);

  const displayed = tab==="pending"?escalations.filter(e=>e.status==="pending"):escalations;
  const handleCreate = async (form) => {
    const { data } = await api.post("/approval-escalations", form);
    setEscalations(p=>[data,...p]); setShowModal(false);
  };
  const handleResolve = async () => {
    await api.put(`/approval-escalations/${resolveId}/resolve`);
    setEscalations(p=>p.map(e=>e.id===resolveId?{...e,status:"resolved"}:e)); setResolveId(null);
  };
  const handleCancel = async () => {
    await api.put(`/approval-escalations/${cancelId}/cancel`);
    setEscalations(p=>p.map(e=>e.id===cancelId?{...e,status:"cancelled"}:e)); setCancelId(null);
  };

  return (
    <Layout>
      <div className="fade-up max-w-6xl">
        <PageHeader title="Approval Escalations" subtitle="Manage and track delayed approval escalations"
          action={user?.role!=="employee"&&(
            <button className="btn-primary !w-auto px-5" onClick={()=>setShowModal(true)}>+ Escalate Approval</button>
          )} />
        <ErrorMessage message={error} />
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{background:"var(--surface)"}}>
          {[{k:"all",l:"All"},{k:"pending",l:"Pending"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
                    className="px-5 text-sm py-2 rounded-lg font-medium"
                    style={{background:tab===t.k?"white":"transparent",color:tab===t.k?"var(--brand)":"var(--muted)"}}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="card !p-0 overflow-hidden">
          {loading?<LoadingSpinner />:displayed.length===0?(
            <EmptyState icon="⬆" title="No escalations found" />
          ):(
            <table className="w-full text-sm">
              <thead style={{background:"var(--surface)"}}>
                <tr>{["ID","Approval","From","To","Reason","Level","Status","Date","Actions"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{color:"var(--muted)"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {displayed.map(e=>(
                  <tr key={e.id} className="border-t hover:bg-slate-50" style={{borderColor:"var(--border)"}}>
                    <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}># {e.id}</td>
                    <td className="px-4 py-3 font-mono">#{e.approval_id}</td>
                    <td className="px-4 py-3 text-xs">{e.from_user?.name||`User #${e.escalated_from}`}</td>
                    <td className="px-4 py-3 text-xs">{e.to_user?.name||`User #${e.escalated_to}`}</td>
                    <td className="px-4 py-3 text-xs max-w-32 truncate" title={e.reason}>{e.reason}</td>
                    <td className="px-4 py-3 text-center">{e.escalation_level}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{color:"var(--muted)"}}>{fmt(e.escalated_at)}</td>
                    <td className="px-4 py-3">
                      {e.status==="pending"&&(
                        <div className="flex gap-1.5">
                          <button onClick={()=>setResolveId(e.id)} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">Resolve</button>
                          <button onClick={()=>setCancelId(e.id)}  className="text-xs px-2 py-1 rounded bg-red-50 text-red-600">Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <EscalateModal open={showModal} approvals={approvals} users={users}
          onSave={handleCreate} onClose={()=>setShowModal(false)} />
        <ConfirmModal open={!!resolveId} title="Resolve Escalation" danger={false}
          message="Mark this escalation as resolved?" onConfirm={handleResolve} onCancel={()=>setResolveId(null)} />
        <ConfirmModal open={!!cancelId} title="Cancel Escalation"
          message="Are you sure you want to cancel this escalation?"
          onConfirm={handleCancel} onCancel={()=>setCancelId(null)} />
      </div>
    </Layout>
  );
}
