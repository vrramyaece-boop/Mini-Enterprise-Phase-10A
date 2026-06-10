// src/pages/ForgotPassword.jsx — Phase 4: Password reset flow
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [step, setStep]     = useState(1);
  const [email, setEmail]   = useState("");
  const [token, setToken]   = useState("");
  const [newPass, setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSuccess(data.message);
      if (data.reset_token) { setToken(data.reset_token); setTimeout(() => setStep(2), 1500); }
      else setStep(2);
    } catch (err) { setError(err.response?.data?.detail || "Request failed."); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { setError("Passwords do not match."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const { data } = await api.post("/auth/reset-password", { token, new_password: newPass });
      setSuccess(data.message + " Redirecting…");
      setTimeout(() => window.location.href = "/login", 2000);
    } catch (err) { setError(err.response?.data?.detail || "Reset failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface)" }}>
      <div className="card w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl mb-1" style={{ color: "var(--brand)" }}>TaskFlow</h1>
          <h2 className="text-xl font-semibold">{step === 1 ? "Forgot Password" : "Set New Password"}</h2>
        </div>

        {error   && <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">❌ {error}</div>}
        {success && <div className="mb-4 p-3 rounded-xl text-sm text-green-700 bg-green-50 border border-green-200">✅ {success}</div>}

        {step === 1 && (
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Email Address</label>
              <input className="input-field" type="email" placeholder="you@example.com"
                     value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Reset Token</label>
              <input className="input-field" placeholder="Paste your reset token"
                     value={token} onChange={e => setToken(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>New Password</label>
              <input className="input-field" type="password" placeholder="Min 8 chars, 1 uppercase, 1 digit"
                     value={newPass} onChange={e => setNewPass(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Confirm Password</label>
              <input className="input-field" type="password" placeholder="Repeat new password"
                     value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        )}
        <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
          <Link to="/login" style={{ color: "var(--brand)", fontWeight: 500 }}>← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
