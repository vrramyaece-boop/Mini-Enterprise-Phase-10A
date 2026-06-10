export default function FilterBar({ children }) {
  return <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-xl" style={{background:"var(--surface)",border:"1px solid var(--border)"}}>{children}</div>;
}
export function FilterSelect({ label, value, onChange, options }) {
  return (<div className="flex flex-col gap-1 min-w-36">
    <label className="text-xs font-medium" style={{color:"var(--muted)"}}>{label}</label>
    <select className="input-field !py-1.5 !text-sm" value={value} onChange={e=>onChange(e.target.value)}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>);
}
export function FilterInput({ label, value, onChange, placeholder="" }) {
  return (<div className="flex flex-col gap-1 min-w-36">
    <label className="text-xs font-medium" style={{color:"var(--muted)"}}>{label}</label>
    <input className="input-field !py-1.5 !text-sm" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
  </div>);
}
