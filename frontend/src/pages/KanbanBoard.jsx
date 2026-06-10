// src/pages/KanbanBoard.jsx — Phase 2 + Phase 8
// Phase 8: SLA badge on each card (red if breached, blue if active, green if done)

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../api/axios";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { SLABadge } from "../components/StatusBadge";

const COLUMNS = [
  { key:"todo",        label:"📋 To Do",      color:"#6b7280", bg:"#f9fafb" },
  { key:"in_progress", label:"🔵 In Progress", color:"#2563eb", bg:"#eff6ff" },
  { key:"review",      label:"🟣 Review",      color:"#7c3aed", bg:"#f5f3ff" },
  { key:"done",        label:"🟢 Done",        color:"#16a34a", bg:"#f0fdf4" },
];

const priorityColor = {
  high:   { background:"#fee2e2", color:"#dc2626" },
  medium: { background:"#fef3c7", color:"#92400e" },
  low:    { background:"#dcfce7", color:"#166534" },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : null;

export default function KanbanBoard() {
  const { user }  = useAuth();
  const [board, setBoard]     = useState({todo:[],in_progress:[],review:[],done:[]});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [moveErr, setMoveErr] = useState("");

  useEffect(() => { fetchKanban(); }, []);

  const fetchKanban = async () => {
    try {
      const { data } = await api.get("/tasks/kanban");
      setBoard(data);
    } catch { setError("Failed to load Kanban board."); }
    finally  { setLoading(false); }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    setMoveErr("");
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const taskId    = parseInt(draggableId);
    const newStatus = destination.droppableId;
    const sourceCol = [...board[source.droppableId]];
    const destCol   = [...board[destination.droppableId]];
    const [moved]   = sourceCol.splice(source.index, 1);
    destCol.splice(destination.index, 0, {...moved, status:newStatus});
    setBoard(prev => ({...prev,
      [source.droppableId]:      sourceCol,
      [destination.droppableId]: destCol,
    }));
    try {
      await api.patch(`/tasks/${taskId}/status`, {status:newStatus});
    } catch (err) {
      setMoveErr(err.response?.data?.detail || "Invalid transition. Move reverted.");
      fetchKanban();
    }
  };

  return (
    <Layout>
      <div className="fade-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-3xl">Kanban Board</h2>
            <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
              Drag cards to move through the workflow · SLA badges show compliance status
            </p>
          </div>
          <button onClick={()=>{ setLoading(true); fetchKanban(); }}
                  className="btn-primary !w-auto px-4 text-sm">
            ⟳ Refresh Board
          </button>
        </div>

        {moveErr && (
          <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
            ❌ {moveErr}
          </div>
        )}

        <div className="flex items-center gap-2 mb-6 text-xs" style={{color:"var(--muted)"}}>
          <span className="font-medium">Valid flow:</span>
          {["📋 Todo","🔵 In Progress","🟣 Review","🟢 Done"].map((s,i,arr)=>(
            <span key={s} className="flex items-center gap-1">
              <span>{s}</span>{i<arr.length-1&&<span>→</span>}
            </span>
          ))}
        </div>

        {loading && <p className="text-center py-20 text-sm" style={{color:"var(--muted)"}}>Loading board…</p>}
        {error   && <p className="text-center py-20 text-sm text-red-500">{error}</p>}

        {!loading && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-4 gap-4">
              {COLUMNS.map(col=>(
                <div key={col.key} className="rounded-2xl overflow-hidden"
                     style={{background:col.bg, border:`1.5px solid ${col.color}22`}}>
                  <div className="px-4 py-3 flex items-center justify-between border-b"
                       style={{borderColor:`${col.color}22`}}>
                    <span className="text-sm font-semibold" style={{color:col.color}}>{col.label}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{background:col.color,color:"#fff"}}>
                      {board[col.key]?.length||0}
                    </span>
                  </div>
                  <Droppable droppableId={col.key}>
                    {(provided, snapshot)=>(
                      <div ref={provided.innerRef} {...provided.droppableProps}
                           className="p-3 flex flex-col gap-3 min-h-48 transition-colors"
                           style={{background:snapshot.isDraggingOver?`${col.color}11`:"transparent",minHeight:"200px"}}>
                        {(board[col.key]||[]).map((task,index)=>(
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}
                                     isDragDisabled={col.key==="done"}>
                            {(prov, snap)=>(
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                   className="bg-white rounded-xl p-3 shadow-sm border transition-shadow"
                                   style={{borderColor: task.is_sla_breached?"#fca5a5":"var(--border)",
                                           background: task.is_sla_breached?"#fff5f5":"white",
                                           boxShadow:snap.isDragging?"0 8px 24px rgba(0,0,0,0.12)":undefined,
                                           ...prov.draggableProps.style}}>
                                <p className="text-sm font-medium mb-2 leading-snug">{task.title}</p>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                                        style={priorityColor[task.priority]||priorityColor.medium}>
                                    {task.priority}
                                  </span>
                                  {/* Phase 8: SLA badge on kanban card */}
                                  {task.sla_status && (
                                    <SLABadge slaStatus={task.sla_status} isBreached={task.is_sla_breached} />
                                  )}
                                </div>
                                {task.due_date && (
                                  <p className="text-xs mt-1" style={{color:"var(--muted)"}}>📅 {fmt(task.due_date)}</p>
                                )}
                                {task.assignee_name && (
                                  <p className="text-xs mt-1" style={{color:"var(--muted)"}}>👤 {task.assignee_name}</p>
                                )}
                                {/* Phase 8: SLA due time on card */}
                                {task.sla_due_time && task.sla_status==="on_track" && (
                                  <p className="text-xs mt-1 font-medium text-blue-600">
                                    ⏱ SLA: {new Date(task.sla_due_time).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                                  </p>
                                )}
                                {task.is_sla_breached && (
                                  <p className="text-xs mt-1 font-bold text-red-600">🔴 SLA Breached!</p>
                                )}
                                {col.key==="done" && (
                                  <p className="text-xs mt-1" style={{color:"#22c55e"}}>✅ Completed</p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {(board[col.key]||[]).length===0 && (
                          <div className="text-center py-8 text-xs" style={{color:`${col.color}88`}}>
                            Drop tasks here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </Layout>
  );
}
