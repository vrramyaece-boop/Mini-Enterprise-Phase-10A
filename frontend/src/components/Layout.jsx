// src/components/Layout.jsx
// Wraps all protected pages — provides the sidebar + main content area

import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface)" }}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
