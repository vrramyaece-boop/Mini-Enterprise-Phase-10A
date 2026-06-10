export default function PageHeader({ title, subtitle, action }) {
  return (<div className="flex items-center justify-between mb-8">
    <div><h2 className="font-display text-3xl">{title}</h2>{subtitle&&<p className="text-sm mt-1" style={{color:"var(--muted)"}}>{subtitle}</p>}</div>
    {action&&<div>{action}</div>}
  </div>);
}
