export function LoadingSpinner({ text="Loading…" }) {
  return (<div className="flex items-center justify-center py-20 flex-col gap-3">
    <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{borderColor:"var(--brand)",borderTopColor:"transparent"}} />
    <p className="text-sm" style={{color:"var(--muted)"}}>{text}</p>
  </div>);
}
export function EmptyState({ icon="📭", title="No records found", message="" }) {
  return (<div className="text-center py-16"><p className="text-4xl mb-3">{icon}</p><p className="font-semibold text-base mb-1">{title}</p>{message&&<p className="text-sm" style={{color:"var(--muted)"}}>{message}</p>}</div>);
}
export function ErrorMessage({ message }) {
  if(!message) return null;
  return <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">❌ {message}</div>;
}
