// src/pages/Documents.jsx — Phase 3 NEW
// Upload, list, download documents. Version control automatic.
// POST /documents/upload  GET /documents/  GET /documents/task/{id}  GET /documents/{id}/download

import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const fmtSize  = (b) => b ? (b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`) : "—";
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

export default function Documents() {
  const { user }    = useAuth();
  const fileInputRef = useRef(null);

  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [taskId, setTaskId]       = useState("");

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    try {
      const { data } = await api.get("/documents/");
      setDocs(data);
    } catch { setError("Failed to load documents."); }
    finally  { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(""); setSuccess("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (taskId) form.append("task_id", taskId);
      await api.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSuccess(`"${file.name}" uploaded successfully!`);
      setTaskId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocs();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally { setUploading(false); }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = doc.file_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert("Download failed."); }
  };

  return (
    <Layout>
      <div className="fade-up max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl">Documents</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Upload, manage and download files with automatic version control
            </p>
          </div>
        </div>

        {/* Upload card */}
        <div className="card mb-6">
          <h3 className="font-semibold text-sm mb-4">📎 Upload New Document</h3>
          {success && (
            <div className="mb-3 p-2 rounded-lg text-sm text-green-700 bg-green-50 border border-green-200">
              ✅ {success}
            </div>
          )}
          {error && (
            <div className="mb-3 p-2 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
              ❌ {error}
            </div>
          )}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                Task ID (optional)
              </label>
              <input className="input-field" type="number" placeholder="Link to task ID"
                     value={taskId} onChange={e => setTaskId(e.target.value)} />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                File (max 10 MB)
              </label>
              <input ref={fileInputRef} type="file" className="input-field"
                     onChange={handleUpload}
                     accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.csv,.docx,.xlsx,.zip" />
            </div>
            {uploading && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>Uploading…</p>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            Allowed: PDF, images, Word, Excel, CSV, ZIP · Same filename = new version auto-created
          </p>
        </div>

        {/* Documents table */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between"
               style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm">
              {docs.length} Document{docs.length !== 1 ? "s" : ""}
            </h3>
          </div>

          {loading && <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}

          {!loading && docs.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>
              No documents yet. Upload your first file above.
            </p>
          )}

          {!loading && docs.length > 0 && (
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface)" }}>
                <tr>
                  {["File Name", "Version", "Size", "Task", "Uploaded By", "Date", "Action"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold"
                        style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} className="border-t hover:bg-slate-50"
                      style={{ borderColor: "var(--border)" }}>
                    <td className="px-5 py-3 font-medium max-w-xs truncate">
                      📄 {doc.file_name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: "var(--brand-50)", color: "var(--brand)" }}>
                        v{doc.version}
                      </span>
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--muted)" }}>{fmtSize(doc.file_size)}</td>
                    <td className="px-5 py-3" style={{ color: "var(--muted)" }}>
                      {doc.task_id ? `Task #${doc.task_id}` : "—"}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--muted)" }}>
                      {doc.uploader?.name || `User #${doc.uploaded_by}`}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--muted)" }}>{fmtDate(doc.created_at)}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDownload(doc)}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg"
                              style={{ background: "#f0fdf4", color: "#166534" }}>
                        ⬇ Download
                      </button>
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
