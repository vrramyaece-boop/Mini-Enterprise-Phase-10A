// src/pages/AIInsights.jsx — Phase 6: AI task insights + smart assignment
import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const riskColors = {
  high:   { bg: "#fee2e2", color: "#dc2626", icon: "🔴" },
  medium: { bg: "#fef3c7", color: "#92400e", icon: "🟡" },
  low:    { bg: "#f0fdf4", color: "#166534", icon: "🟢" },
};

export default function AIInsights() {
  const { user }  = useAuth();
  const [insights, setInsights]     = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/ai/task-insights"),
      api.get("/tasks/"),
    ])
    .then(([insRes, tasksRes]) => {
      setInsights(insRes.data);
      // tasks endpoint returns paginated or list depending on phase
      const taskList = Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data.items || [];
      setTasks(taskList);
    })
    .catch(() => setError("Failed to load AI insights."))
    .finally(() => setLoading(false));
  }, []);

  const handleSmartAssign = async () => {
    if (!selectedTask) return;
    setLoadingSuggest(true);
    try {
      const { data } = await api.get(`/ai/smart-assign/${selectedTask}`);
      setSuggestions(data);
    } catch { setSuggestions([]); }
    finally { setLoadingSuggest(false); }
  };

  const highCount   = insights.filter(i => i.risk_level === "high").length;
  const mediumCount = insights.filter(i => i.risk_level === "medium").length;

  return (
    <Layout>
      <div className="fade-up max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <h2 className="font-display text-3xl">AI Insights</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Intelligent task analysis — Phase 6
          </p>
        </div>

        {loading && <p className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>Analysing tasks…</p>}
        {error   && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {!loading && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "High Risk Tasks",   value: highCount,             color: "#dc2626", icon: "🔴" },
                { label: "Medium Risk Tasks", value: mediumCount,            color: "#f59e0b", icon: "🟡" },
                { label: "Total Analysed",    value: insights.length,        color: "#4361ee", icon: "📊" },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Task insights list */}
            <div className="card mb-6">
              <h3 className="font-semibold text-sm mb-4">💡 Task Risk Analysis</h3>
              {insights.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>
                  No pending tasks to analyse — great job! 🎉
                </p>
              )}
              <div className="flex flex-col gap-3">
                {insights.map(ins => {
                  const style = riskColors[ins.risk_level] || riskColors.low;
                  return (
                    <div key={ins.task_id} className="p-4 rounded-xl border"
                         style={{ background: style.bg, borderColor: style.color + "33" }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{style.icon}</span>
                            <span className="font-semibold text-sm">
                              #{ins.task_id} — {ins.task_title}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: style.color, color: "#fff" }}>
                              {ins.risk_level} risk
                            </span>
                          </div>
                          <p className="text-xs mb-1" style={{ color: style.color }}>
                            ⚠ {ins.risk_reason}
                          </p>
                          <p className="text-xs" style={{ color: "#374151" }}>
                            💡 {ins.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart assignment — only for admin/manager */}
            {(user?.role === "admin" || user?.role === "manager") && (
              <div className="card">
                <h3 className="font-semibold text-sm mb-4">🎯 Smart Task Assignment</h3>
                <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                  Select a task to get AI-ranked employee suggestions based on workload and performance.
                </p>
                <div className="flex gap-3 mb-4">
                  <select className="input-field flex-1"
                          value={selectedTask}
                          onChange={e => setSelectedTask(e.target.value)}>
                    <option value="">— Select a task —</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>#{t.id} — {t.title}</option>
                    ))}
                  </select>
                  <button className="btn-primary !w-auto px-5"
                          onClick={handleSmartAssign}
                          disabled={!selectedTask || loadingSuggest}>
                    {loadingSuggest ? "Analysing…" : "Get Suggestions"}
                  </button>
                </div>

                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {suggestions.map((s, i) => (
                      <div key={s.user_id}
                           className="flex items-center gap-4 p-3 rounded-xl border"
                           style={{ background: i === 0 ? "#f0fdf4" : "var(--surface)",
                                    borderColor: i === 0 ? "#86efac" : "var(--border)" }}>
                        {/* Rank badge */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                             style={{ background: i === 0 ? "#16a34a" : i === 1 ? "#2563eb" : "#6b7280" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{s.user_name}</p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{s.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold" style={{ color: "var(--brand)" }}>
                            Score: {s.score}
                          </p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>
                            {s.active_tasks} active tasks
                          </p>
                        </div>
                        {i === 0 && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{ background: "#dcfce7", color: "#166534" }}>
                            ⭐ Best Match
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
