// src/pages/ChangePassword.jsx — Phase 4
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter",  ok: /[A-Z]/.test(password) },
    { label: "One digit",             ok: /\d/.test(password) },
  ];
  const score  = checks.filter(c => c.ok).length;
  const colors = ["#dc2626","#f59e0b","#16a34a"];
  const labels = ["Weak","Fair","Strong"];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0,1,2].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full"
               style={{ background: i < score ? colors[score-1] : "#e5e7eb" }} />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: colors[score-1] || "#9ca3af" }}>
        {score > 0 ? labels[score-1] : "Too weak"}
      </p>
      {checks.map(c => (
        <p key={c.label} className="text-xs" style={{ color: c.ok ? "#16a34a" : "#9ca3af" }}>
          {c.ok ? "✓" : "○"} {c.label}
        </p>
      ))}
    </div>
  );
};

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) { setError("Passwords do not match."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const { data } = await api.post("/auth/change-password",
        { current_password: form.current_password, new_password: form.new_password });
      setSuccess(data.message);
      setTimeout(() => { logout(); navigate("/login"); }, 2000);
    } catch (err) { setError(err.response?.data?.detail || "Change failed."); }
    finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="fade-up max-w-md">
        <div className="mb-8">
          <button onClick={() => navigate("/dashboard")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--muted)" }}>← Dashboard</button>
          <h2 className="font-display text-3xl">Change Password</h2>
        </div>
        <div className="card">
          {error   && <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">❌ {error}</div>}
          {success && <div className="mb-4 p-3 rounded-xl text-sm text-green-700 bg-green-50 border border-green-200">✅ {success}</div>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Current Password</label>
              <input className="input-field" type="password" name="current_password"
                     value={form.current_password} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>New Password</label>
              <input className="input-field" type="password" name="new_password"
                     value={form.new_password} onChange={handleChange} required />
              <PasswordStrength password={form.new_password} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Confirm New Password</label>
              <input className="input-field" type="password" name="confirm_password"
                     value={form.confirm_password} onChange={handleChange} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Changing…" : "Change Password"}</button>
              <button className="btn-secondary" type="button" onClick={() => navigate("/dashboard")}>Cancel</button>
            </div>
          </form>
          <p className="mt-4 text-xs text-yellow-600">⚠ You will be logged out after changing your password.</p>
        </div>
      </div>
    </Layout>
  );
}
