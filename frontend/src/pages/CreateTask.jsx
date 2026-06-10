// src/pages/CreateTask.jsx
// Form to create a new task — only accessible to admin and manager

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

export default function CreateTask() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "", description: "", status: "todo",
    priority: "medium", due_date: "", assigned_to_id: "",
  });
  const [users, setUsers]     = useState([]);   // list of all users for the assign dropdown
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  // Load users list for the "Assign To" dropdown
  // Admins use GET /users/, managers can only assign to existing users they know
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Only admins have access to /users/ — managers will get 403
        if (user?.role === "admin") {
          const { data } = await api.get("/users/");
          setUsers(data);
        }
      } catch {
        // managers won't have the user list — that's OK
      }
    };
    fetchUsers();
  }, [user]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Build payload — only include assigned_to_id if it's set
    const payload = {
      ...form,
      assigned_to_id: form.assigned_to_id ? parseInt(form.assigned_to_id) : null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    };

    try {
      await api.post("/tasks/", payload);
      navigate("/dashboard");   // go back to dashboard on success
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="fade-up max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate("/dashboard")}
                  className="text-sm mb-4 flex items-center gap-1"
                  style={{ color: "var(--muted)" }}>
            ← Back to Dashboard
          </button>
          <h2 className="font-display text-3xl">Create Task</h2>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Title */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Task Title <span className="text-red-500">*</span>
              </label>
              <input className="input-field" name="title" placeholder="Enter task title"
                     value={form.title} onChange={handleChange} required />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Description
              </label>
              <textarea className="input-field resize-none" name="description" rows={3}
                        placeholder="What needs to be done?"
                        value={form.description} onChange={handleChange} />
            </div>

            {/* Status + Priority in a row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                  Status
                </label>
                <select className="input-field" name="status" value={form.status} onChange={handleChange}>
                  <option value="todo">📋 To Do</option>
                  <option value="in_progress">🔵 In Progress</option>
                  <option value="review">🟣 Review</option>
                  <option value="done">🟢 Done</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                  Priority
                </label>
                <select className="input-field" name="priority" value={form.priority} onChange={handleChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Due Date
              </label>
              <input className="input-field" type="date" name="due_date"
                     value={form.due_date} onChange={handleChange} />
            </div>

            {/* Assign to (admin only — needs /users/ access) */}
            {user?.role === "admin" && users.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                  Assign To
                </label>
                <select className="input-field" name="assigned_to_id"
                        value={form.assigned_to_id} onChange={handleChange}>
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manager: manually enter user ID to assign */}
            {user?.role === "manager" && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                  Assign To (User ID)
                </label>
                <input className="input-field" type="number" name="assigned_to_id"
                       placeholder="Enter user ID" value={form.assigned_to_id} onChange={handleChange} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create Task"}
              </button>
              <button className="btn-secondary" type="button" onClick={() => navigate("/dashboard")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
