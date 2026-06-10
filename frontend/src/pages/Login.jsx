// src/pages/Login.jsx — Phase 1 + Phase 4 (forgot password link)
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: "var(--surface)" }}>
      <div className="card w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl mb-1" style={{ color: "var(--brand)" }}>TaskFlow</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Enterprise Suite v7</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Email</label>
            <input className="input-field" type="email" name="email"
                   placeholder="you@company.com"
                   value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Password</label>
              <Link to="/forgot-password" className="text-xs" style={{ color: "var(--brand)" }}>
                Forgot password?
              </Link>
            </div>
            <input className="input-field" type="password" name="password"
                   placeholder="Your password"
                   value={form.password} onChange={handleChange} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
          No account?{" "}
          <Link to="/register" style={{ color: "var(--brand)", fontWeight: 500 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
