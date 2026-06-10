export function StatusBadge({ status }) {
  const map={active:{bg:"#dbeafe",color:"#1d4ed8"},breached:{bg:"#fee2e2",color:"#dc2626"},completed:{bg:"#dcfce7",color:"#166534"},pending:{bg:"#fef3c7",color:"#92400e"},resolved:{bg:"#dcfce7",color:"#166534"},cancelled:{bg:"#f3f4f6",color:"#6b7280"},escalated:{bg:"#fed7aa",color:"#c2410c"},on_track:{bg:"#dbeafe",color:"#1d4ed8"},approved:{bg:"#dcfce7",color:"#166534"},rejected:{bg:"#fee2e2",color:"#dc2626"},on_hold:{bg:"#fef3c7",color:"#92400e"},high:{bg:"#fee2e2",color:"#dc2626"},medium:{bg:"#fef3c7",color:"#92400e"},low:{bg:"#f0fdf4",color:"#166534"}};
  const s=map[status?.toLowerCase().replace(/ /g,"_")||""]||{bg:"#f3f4f6",color:"#6b7280"};
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{background:s.bg,color:s.color}}>{status||"—"}</span>;
}
export function SLABadge({ slaStatus, isBreached }) {
  if(isBreached||slaStatus==="breached") return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:"#fee2e2",color:"#dc2626"}}>🔴 Breached</span>;
  if(slaStatus==="completed") return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:"#dcfce7",color:"#166534"}}>✅ Done</span>;
  if(slaStatus==="on_track"||slaStatus==="active") return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:"#dbeafe",color:"#1d4ed8"}}>🔵 Active</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{background:"#f3f4f6",color:"#9ca3af"}}>—</span>;
}
