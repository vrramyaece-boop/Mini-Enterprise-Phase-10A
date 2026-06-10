export default function ConfirmModal({ open, title, message, onConfirm, onCancel, danger=true }) {
  if (!open) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.4)"}}>
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm mb-6" style={{color:"var(--muted)"}}>{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-secondary !w-auto px-4 text-sm">Cancel</button>
        <button onClick={onConfirm} className="!w-auto px-4 py-2 rounded-xl text-sm font-medium text-white" style={{background:danger?"#dc2626":"var(--brand)"}}>Confirm</button>
      </div>
    </div>
  </div>);
}
