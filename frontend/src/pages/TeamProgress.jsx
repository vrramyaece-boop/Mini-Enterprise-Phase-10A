// src/pages/TeamProgress.jsx — NEW
// Manager role: "Monitor team progress" (spec §4)
// Shows per-member task breakdown: todo / in_progress / review / done
// GET /dashboard/team-progress

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const statusColors = {
  todo:        { bg: "#f3f4f6", text: "#374151" },
  in_progress: { bg: "#dbeafe", text: "#1d4ed8" },
  review:      { bg: "#f5f3ff", text: "#7c3aed" },
  done:        { bg: "#dcfce7", text: "#16a34a" },
};

export default function TeamProgress() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    // Only admin and manager can access this page
    if (user?.role === "employee") {
      navigate("/dashboard");
      return;
    }

    api.get("/dashboard/team-progress")
      .then(res => setData(res.data))
      .catch(() => setError("Failed to load team progress."))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  // Progress bar width helper
  const pct = (count, total) =>
    total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <Layout>
      <div className="fade-up max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">Team Progress</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {user?.role === "admin"
                ? "Full organisation task progress"
                : "Your team's task breakdown"}
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-secondary !w-auto px-4 text-sm"
          >
            ← Dashboard
          </button>
        </div>

        {loading && (
          <p className="text-sm text-center py-16" style={{ color: "var(--muted)" }}>
            Loading team progress…
          </p>
        )}
        {error && (
          <p className="text-sm text-center py-16 text-red-500">{error}</p>
        )}

        {data && (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Total Tasks",   value: data.total_tasks,   color: "#4361ee" },
                { label: "Completed",     value: data.done_tasks,    color: "#16a34a" },
                { label: "Overdue",       value: data.overdue_tasks, color: "#dc2626" },
              ].map((s) => (
                <div key={s.label} className="card text-center">
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Per-member breakdown table */}
            <div className="card !p-0 overflow-hidden">
              <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm">
                  Per-Member Breakdown — {data.team_members.length} member{data.team_members.length !== 1 ? "s" : ""}
                </h3>
              </div>

              {data.team_members.length === 0 && (
                <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>
                  No task data yet.
                </p>
              )}

              {data.team_members.map((member) => (
                <div
                  key={member.user_id}
                  className="px-6 py-5 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Member name + role */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar initials */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center
                                   text-white text-xs font-bold shrink-0"
                        style={{ background: "var(--brand)" }}
                      >
                        {member.user_name !== "Unassigned"
                          ? member.user_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                          : "—"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{member.user_name}</p>
                        {member.user_role && (
                          <p className="text-xs capitalize" style={{ color: "var(--muted)" }}>
                            {member.user_role}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: "var(--brand-50)", color: "var(--brand)" }}>
                      {member.total} task{member.total !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Status badges row */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[
                      { key: "todo",        label: "To Do" },
                      { key: "in_progress", label: "In Progress" },
                      { key: "review",      label: "Review" },
                      { key: "done",        label: "Done" },
                    ].map((s) => (
                      <span
                        key={s.key}
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={statusColors[s.key]}
                      >
                        {s.label}: {member[s.key] || 0}
                      </span>
                    ))}
                  </div>

                  {/* Progress bar: done vs total */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct(member.done, member.total)}%`,
                          background: "#16a34a",
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right"
                          style={{ color: "#16a34a" }}>
                      {pct(member.done, member.total)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
