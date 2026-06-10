export default function ToggleSwitch({ checked, onChange, label, description }) {
  return (<div className="flex items-center justify-between py-3 border-b last:border-0" style={{borderColor:"var(--border)"}}>
    <div><p className="text-sm font-medium">{label}</p>{description&&<p className="text-xs mt-0.5" style={{color:"var(--muted)"}}>{description}</p>}</div>
    <button onClick={()=>onChange(!checked)} className="relative w-11 h-6 rounded-full transition-colors duration-200" style={{background:checked?"var(--brand)":"#d1d5db"}}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200" style={{transform:checked?"translateX(20px)":"translateX(0)"}} />
    </button>
  </div>);
}
