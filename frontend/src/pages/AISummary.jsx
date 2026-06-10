// src/pages/AISummary.jsx — Phase 3 NEW
// AI-powered insights from live task data. GET /dashboard/ai-summary

import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

export default function AISummary() {
  const { user }  = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/dashboard/ai-summary")
       .then(r => setData(r.data))
       .catch(() => setError("Failed to load AI summary."))
       .finally(() => setLoading(false));
  }, []);

  const statCards = data ? [
    { label: "Pending Tasks",     value: data.total_pending,       color: "#f59e0b", icon: "📋" },
    { label: "High Priority",     value: data.high_priority_count, color: "#dc2626", icon: "🔴" },
    { label: "Delayed / Overdue", value: data.delayed_count,       color: "#7c3aed", icon: "⏰" },
  ] : [];

  return (
    <Layout>
      <div className="fade-up max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <h2 className="font-display text-3xl">AI Insights</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Intelligent summary based on your live task and workflow data
          </p>
        </div>

        {loading && (
          <p className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>
            Analysing your data…
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {data && (
          <>
            {/* Summary banner */}
            <div className="card mb-6"
                 style={{ background: "linear-gradient(135deg, var(--brand-50), #f5f3ff)" }}>
              <p className="text-xs font-semibold uppercase mb-1"
                 style={{ color: "var(--muted)", letterSpacing: ".05em" }}>
                AI Summary
              </p>
              <p className="text-lg font-semibold">{data.summary_text}</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {statCards.map(s => (
                <div key={s.label} className="card text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Insights list */}
            {data.insights.length > 0 && (
              <div className="card mb-6">
                <h3 className="font-semibold text-sm mb-4">💡 Insights</h3>
                <div className="flex flex-col gap-3">
                  {data.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                         style={{ background: "var(--surface)" }}>
                      <span className="text-base shrink-0 mt-0.5">{insight.slice(0, 2)}</span>
                      <p className="text-sm">{insight.slice(2).trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity feed */}
            {data.activity_feed.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm mb-4">📰 Recent Activity Feed</h3>
                <div className="flex flex-col gap-2">
                  {data.activity_feed.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b last:border-0"
                         style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                      <span className="shrink-0">▸</span>
                      <span className="font-mono">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
