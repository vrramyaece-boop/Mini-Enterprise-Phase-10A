// src/pages/Register.jsx
// Registration form — sends user data to /auth/register

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm]         = useState({ name: "", email: "", password: "", role: "employee" });
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // POST /auth/register
      await api.post("/auth/register", form);
      setSuccess(true);

      // Auto-redirect to login after 2 seconds
      setTimeout(() => navigate("/login"), 2000);

    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e8ecfb 100%)" }}>

      <div className="w-full max-w-md fade-up">

        <div className="text-center mb-8">
          <h1 className="font-display text-4xl mb-2" style={{ color: "var(--brand)" }}>
            TaskFlow
          </h1>
          <p style={{ color: "var(--muted)" }} className="text-sm">
            Create your account
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Register</h2>

          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 rounded-xl text-sm text-green-700 bg-green-50 border border-green-200">
              ✅ Registered! Redirecting to login…
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Full Name
              </label>
              <input
                className="input-field"
                type="text"
                name="name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Email address
              </label>
              <input
                className="input-field"
                type="email"
                name="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Password
              </label>
              <input
                className="input-field"
                type="password"
                name="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Role
              </label>
              {/* Dropdown for role selection */}
              <select
                className="input-field"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button className="btn-primary mt-2" type="submit" disabled={loading || success}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold" style={{ color: "var(--brand)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
