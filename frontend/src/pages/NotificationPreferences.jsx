// pages/NotificationPreferences.jsx — Phase 8: Notification Preferences
import { useState, useEffect } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import ToggleSwitch from "../components/ToggleSwitch";
import { LoadingSpinner, ErrorMessage } from "../components/LoadingSpinner";

export default function NotificationPreferences() {
  const [prefs,   setPrefs]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/notification-preferences/me")
       .then(r => setPrefs(r.data))
       .catch(() => setError("Failed to load preferences"))
       .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const { data } = await api.put("/notification-preferences/me", prefs);
      setPrefs(data); setSuccess("Preferences saved successfully! ✅");
      setTimeout(()=>setSuccess(""), 3000);
    } catch (e) { setError(e.response?.data?.detail || "Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <Layout><LoadingSpinner text="Loading preferences…" /></Layout>;

  const channels = [
    { key:"in_app_enabled",  label:"In-App Notifications",  desc:"Show real-time alerts inside the app" },
    { key:"email_enabled",   label:"Email Notifications",    desc:"Send notifications to your email" },
  ];
  const types = [
    { key:"task_notifications",       label:"Task Notifications",        desc:"Alerts for task assignments, updates, and status changes" },
    { key:"approval_notifications",   label:"Approval Notifications",    desc:"Alerts for approval submissions and decisions" },
    { key:"escalation_notifications", label:"Escalation Notifications",  desc:"Alerts when approvals are escalated to you" },
    { key:"document_notifications",   label:"Document Notifications",    desc:"Alerts when documents are uploaded to your tasks" },
  ];

  return (
    <Layout>
      <div className="fade-up max-w-2xl">
        <PageHeader title="Notification Preferences"
          subtitle="Choose which notifications you receive and how" />

        <ErrorMessage message={error} />
        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium"
               style={{background:"#f0fdf4",color:"#166534",border:"1px solid #86efac"}}>
            {success}
          </div>
        )}

        {prefs && (
          <>
            {/* Channel preferences */}
            <div className="card mb-4">
              <h3 className="font-semibold text-sm mb-0.5">Notification Channels</h3>
              <p className="text-xs mb-4" style={{color:"var(--muted)"}}>How you want to receive notifications</p>
              {channels.map(c=>(
                <ToggleSwitch key={c.key} label={c.label} description={c.desc}
                              checked={!!prefs[c.key]} onChange={()=>toggle(c.key)} />
              ))}
            </div>

            {/* Type preferences */}
            <div className="card mb-6">
              <h3 className="font-semibold text-sm mb-0.5">Notification Types</h3>
              <p className="text-xs mb-4" style={{color:"var(--muted)"}}>Which events trigger notifications</p>
              {types.map(t=>(
                <ToggleSwitch key={t.key} label={t.label} description={t.desc}
                              checked={!!prefs[t.key]} onChange={()=>toggle(t.key)} />
              ))}
            </div>

            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Preferences"}
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}
