// src/pages/SaaS.jsx — Phase 7: Multi-tenant + Subscriptions + Billing
import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const PLAN_INFO = {
  basic:  { icon: "🥉", color: "#6b7280", price: "Free",    users: 5,   tasks: 50,   credits: 100  },
  silver: { icon: "🥈", color: "#6366f1", price: "₹999/mo", users: 20,  tasks: 500,  credits: 500  },
  gold:   { icon: "🥇", color: "#f59e0b", price: "₹2999/mo",users: 100, tasks: 5000, credits: 2000 },
};

export default function SaaS() {
  const { user }  = useAuth();
  const [orgs, setOrgs]           = useState([]);
  const [plans, setPlans]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgForm, setOrgForm]     = useState({ name: "", slug: "", plan: "basic" });
  const [creating, setCreating]   = useState(false);
  const [payForm, setPayForm]     = useState({ org_id: "", plan: "silver", gateway: "razorpay" });
  const [payResult, setPayResult] = useState(null);
  const [paying, setPaying]       = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") { setLoading(false); return; }
    Promise.all([api.get("/saas/organizations"), api.get("/saas/plans")])
      .then(([orgRes, planRes]) => { setOrgs(orgRes.data); setPlans(planRes.data); })
      .catch(() => setError("Failed to load SaaS data."))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const orgId = params.get("organization_id");
    const plan = params.get("plan");
    const gateway = params.get("gateway");
    const cancelled = params.get("cancelled");

    if (cancelled) {
      setError("Stripe checkout was cancelled.");
      window.history.replaceState({}, document.title, "/saas");
      return;
    }

    if (sessionId && orgId && plan && gateway === "stripe") {
      const verifyStripePayment = async () => {
        setPaying(true);
        setError("");
        try {
          const { data } = await api.post("/saas/billing/verify", {
            gateway_order_id: sessionId,
            gateway_payment_id: "",
            organization_id: parseInt(orgId, 10),
          });
          setVerifyMessage(data.message || "Payment verified and plan updated.");
          const { data: orgRes } = await api.get("/saas/organizations");
          setOrgs(orgRes);
        } catch (err) {
          setError(err.response?.data?.detail || "Payment verification failed.");
        } finally {
          setPaying(false);
          window.history.replaceState({}, document.title, "/saas");
        }
      };
      verifyStripePayment();
    }
  }, [user]);

  const handleCreateOrg = async (e) => {
    e.preventDefault(); setCreating(true); setError("");
    try {
      const { data } = await api.post("/saas/organizations", orgForm);
      setOrgs(prev => [...prev, data]);
      setOrgForm({ name: "", slug: "", plan: "basic" });
      setShowCreateOrg(false);
    } catch (err) { setError(err.response?.data?.detail || "Creation failed."); }
    finally { setCreating(false); }
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault(); setPaying(true); setError(""); setPayResult(null);
    try {
      const { data } = await api.post("/saas/billing/initiate", {
        organization_id: parseInt(payForm.org_id, 10),
        plan:    payForm.plan,
        gateway: payForm.gateway,
      });
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setPayResult(data);
    } catch (err) { setError(err.response?.data?.detail || "Payment initiation failed."); }
    finally { setPaying(false); }
  };

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="fade-up max-w-2xl text-center py-20">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="font-display text-2xl mb-2">Admin Access Required</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            SaaS management is only available to administrators.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="fade-up max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">SaaS Management</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Multi-tenant organizations · Subscriptions · Billing — Phase 7
            </p>
          </div>
          <button className="btn-primary !w-auto px-5" onClick={() => setShowCreateOrg(!showCreateOrg)}>
            {showCreateOrg ? "Cancel" : "+ New Organization"}
          </button>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">❌ {error}</div>}
        {verifyMessage && <div className="mb-4 p-3 rounded-xl text-sm text-green-700 bg-emerald-50 border border-emerald-200">✅ {verifyMessage}</div>}

        {/* Create org form */}
        {showCreateOrg && (
          <div className="card mb-6 fade-up">
            <h3 className="font-semibold text-sm mb-4">Create New Organization</h3>
            <form onSubmit={handleCreateOrg} className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Name *</label>
                <input className="input-field" placeholder="Acme Corp"
                       value={orgForm.name} onChange={e => setOrgForm(p=>({...p,name:e.target.value}))} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Slug *</label>
                <input className="input-field" placeholder="acme-corp"
                       value={orgForm.slug} onChange={e => setOrgForm(p=>({...p,slug:e.target.value}))} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Plan</label>
                <select className="input-field" value={orgForm.plan}
                        onChange={e => setOrgForm(p=>({...p,plan:e.target.value}))}>
                  <option value="basic">Basic (Free)</option>
                  <option value="silver">Silver (₹999/mo)</option>
                  <option value="gold">Gold (₹2999/mo)</option>
                </select>
              </div>
              <div className="col-span-3">
                <button className="btn-primary !w-auto px-6" type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {Object.entries(PLAN_INFO).map(([plan, info]) => (
            <div key={plan} className="card text-center"
                 style={{ borderColor: info.color + "44", borderWidth: 2 }}>
              <p className="text-3xl mb-2">{info.icon}</p>
              <h3 className="font-bold text-lg capitalize">{plan}</h3>
              <p className="text-xl font-bold mt-1 mb-3" style={{ color: info.color }}>{info.price}</p>
              <div className="text-xs flex flex-col gap-1" style={{ color: "var(--muted)" }}>
                <p>👥 Up to {info.users} users</p>
                <p>📋 Up to {info.tasks} tasks</p>
                <p>💳 {info.credits} credits</p>
              </div>
            </div>
          ))}
        </div>

        {/* Organizations table */}
        <div className="card !p-0 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b font-semibold text-sm" style={{ borderColor: "var(--border)" }}>
            Organizations ({orgs.length})
          </div>
          {loading && <p className="text-center py-10 text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}
          {!loading && orgs.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: "var(--muted)" }}>No organizations yet.</p>
          )}
          {!loading && orgs.length > 0 && (
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface)" }}>
                <tr>
                  {["ID","Name","Slug","Plan","Status","Created"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold"
                        style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr key={org.id} className="border-t hover:bg-slate-50"
                      style={{ borderColor: "var(--border)" }}>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>#{org.id}</td>
                    <td className="px-5 py-3 font-medium">{org.name}</td>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: "var(--muted)" }}>{org.slug}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                            style={{ background: PLAN_INFO[org.plan]?.color + "22",
                                     color: PLAN_INFO[org.plan]?.color }}>
                        {PLAN_INFO[org.plan]?.icon} {org.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: org.is_active ? "#dcfce7" : "#fee2e2",
                                     color: org.is_active ? "#166534" : "#dc2626" }}>
                        {org.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(org.created_at).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Billing / Payment */}
        {orgs.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-sm mb-4">💳 Initiate Payment</h3>
            <form onSubmit={handleInitiatePayment} className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Organization</label>
                <select className="input-field" value={payForm.org_id}
                        onChange={e => setPayForm(p=>({...p,org_id:e.target.value}))} required>
                  <option value="">— Select org —</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Upgrade to Plan</label>
                <select className="input-field" value={payForm.plan}
                        onChange={e => setPayForm(p=>({...p,plan:e.target.value}))}>
                  <option value="silver">Silver — ₹999/mo</option>
                  <option value="gold">Gold — ₹2999/mo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Gateway</label>
                <select className="input-field" value={payForm.gateway}
                        onChange={e => setPayForm(p=>({...p,gateway:e.target.value}))}>
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn-primary w-full" type="submit" disabled={paying || !payForm.org_id}>
                  {paying ? "Processing…" : "Initiate Payment"}
                </button>
              </div>
            </form>

            {payResult && (
              <div className="mt-4 p-4 rounded-xl border"
                   style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
                <p className="font-semibold text-sm text-green-700 mb-2">✅ Payment Order Created</p>
                <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "#374151" }}>
                  <p><span className="font-medium">Gateway:</span> {payResult.gateway}</p>
                  <p><span className="font-medium">Plan:</span> {payResult.plan}</p>
                  <p><span className="font-medium">Amount:</span> ₹{(payResult.amount/100).toFixed(0)}</p>
                  <p><span className="font-medium">Order ID:</span> {payResult.gateway_order_id}</p>
                </div>
                <p className="mt-2 text-xs text-blue-700">{payResult.note}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
