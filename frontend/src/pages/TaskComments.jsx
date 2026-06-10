// src/pages/TaskComments.jsx — Phase 2 NEW
// Comments & activity on a specific task
// POST /tasks/{id}/comments
// GET  /tasks/{id}/comments

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export default function TaskComments() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [task, setTask]           = useState(null);
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [content, setContent]     = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [posting, setPosting]     = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [taskRes, commentsRes] = await Promise.all([
          api.get(`/tasks/${id}`),
          api.get(`/tasks/${id}/comments`),
        ]);
        setTask(taskRes.data);
        setComments(commentsRes.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setError("");
    try {
      const { data } = await api.post(`/tasks/${id}/comments`, {
        content,
        is_internal: isInternal,
      });
      setComments((prev) => [...prev, data]);
      setContent("");
      setIsInternal(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  const canSeeInternal = user?.role !== "employee";

  return (
    <Layout>
      <div className="fade-up max-w-3xl">

        {/* Back button */}
        <button onClick={() => navigate("/dashboard")}
                className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--muted)" }}>
          ← Back to Dashboard
        </button>

        {/* Task info */}
        {task && (
          <div className="card mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl">{task.title}</h2>
                {task.description && (
                  <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{task.description}</p>
                )}
              </div>
              <span className={`badge-${task.status} shrink-0`}>
                {task.status.replace("_", " ")}
              </span>
            </div>
          </div>
        )}

        {loading && <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {/* Comments list */}
        <div className="card mb-6">
          <h3 className="font-semibold text-sm mb-4">
            💬 Comments ({comments.length})
          </h3>

          {comments.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No comments yet. Be the first to add one!
            </p>
          )}

          <div className="flex flex-col gap-4">
            {comments.map((c) => (
              <div key={c.id}
                   className="flex gap-3 p-3 rounded-xl"
                   style={{
                     background: c.is_internal ? "#fef3c7" : "var(--surface)",
                     border: `1px solid ${c.is_internal ? "#fde68a" : "var(--border)"}`,
                   }}>

                {/* FIX: Avatar shows initials from real author name */}
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                     style={{ background: "var(--brand)" }}>
                  {c.author?.name ? c.author.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) : c.user_id}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* FIX: Real name from author object (spec §5.3 user tracking) */}
                    <span className="text-xs font-semibold">{c.author?.name || `User #${c.user_id}`}</span>
                    {c.author?.role && (
                      <span className="text-xs capitalize px-1.5 py-0.5 rounded"
                            style={{ background: "var(--brand-50)", color: "var(--brand)" }}>
                        {c.author.role}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{fmt(c.created_at)}</span>
                    {c.is_internal && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ background: "#fbbf24", color: "#78350f" }}>
                        🔒 Internal
                      </span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add comment form */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">Add Comment</h3>
          <form onSubmit={handlePost} className="flex flex-col gap-3">
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Write your comment…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />

            {/* Internal toggle — only for managers and admins */}
            {canSeeInternal && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                <span>Mark as internal note (hidden from employees)</span>
              </label>
            )}

            <div className="flex gap-3">
              <button className="btn-primary !w-auto px-6" type="submit" disabled={posting}>
                {posting ? "Posting…" : "Post Comment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
