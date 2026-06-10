// src/pages/AllUsers.jsx
// Admin-only page — shows a list of ALL registered users
// Backend: GET /users/ → only works if logged in user is Admin

import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

export default function AllUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    // Guard: if somehow a non-admin reaches this page, redirect away
    if (user?.role !== "admin") {
      navigate("/dashboard");
      return;
    }

    const fetchUsers = async () => {
      try {
        // GET /users/ — Admin only endpoint (backend enforces this too)
        const { data } = await api.get("/users/");
        setUsers(data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, navigate]);

  // Helper: give each role a color badge
  const roleBadge = (role) => {
    const styles = {
      admin:    { background: "#fee2e2", color: "#dc2626" },
      manager:  { background: "#dbeafe", color: "#1d4ed8" },
      employee: { background: "#dcfce7", color: "#166534" },
    };
    return styles[role] || { background: "#f3f4f6", color: "#374151" };
  };

  // Helper: format the date nicely
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <Layout>
      <div className="fade-up max-w-5xl">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">All Users</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Admin view — {users.length} registered user{users.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Stat cards — quick count by role */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Admins",    value: users.filter((u) => u.role === "admin").length,    color: "#dc2626" },
            { label: "Managers",  value: users.filter((u) => u.role === "manager").length,  color: "#1d4ed8" },
            { label: "Employees", value: users.filter((u) => u.role === "employee").length, color: "#166534" },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="card !p-0 overflow-hidden">

          {/* Table header bar */}
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm">Registered Users</h3>
          </div>

          {/* Loading state */}
          {loading && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>
              Loading users…
            </p>
          )}

          {/* Error state */}
          {error && (
            <p className="text-center py-12 text-sm text-red-500">{error}</p>
          )}

          {/* Empty state */}
          {!loading && users.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>
              No users found.
            </p>
          )}

          {/* Filled table */}
          {!loading && users.length > 0 && (
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface)" }}>
                <tr>
                  {["#", "Name", "Email", "Role", "Status", "Joined"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-xs font-semibold"
                      style={{ color: "var(--muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr
                    key={u.id}
                    className="border-t hover:bg-slate-50 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Row number */}
                    <td className="px-6 py-4 text-xs" style={{ color: "var(--muted)" }}>
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 font-medium">{u.name}</td>

                    {/* Email */}
                    <td className="px-6 py-4" style={{ color: "var(--muted)" }}>
                      {u.email}
                    </td>

                    {/* Role badge */}
                    <td className="px-6 py-4">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full capitalize"
                        style={roleBadge(u.role)}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Active/Inactive */}
                    <td className="px-6 py-4">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          background: u.is_active ? "#dcfce7" : "#f3f4f6",
                          color:      u.is_active ? "#166534" : "#6b7280",
                        }}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Joined date */}
                    <td className="px-6 py-4" style={{ color: "var(--muted)" }}>
                      {fmt(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}