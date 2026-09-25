"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Reclamation, Staff, isMaintenanceFixTicket } from "@/utils/roomsData";
import { acknowledgeReclamation, resolveReclamation } from "@/app/actions";

interface Props {
  reclamations: Reclamation[];
  technicians: Staff[];
}

export default function MaintenancePortal({ reclamations, technicians }: Props) {
  const [selectedTechId, setSelectedTechId] = useState<number | "ALL">("ALL");
  const [filterFloor, setFilterFloor] = useState<number | "ALL">("ALL");
  const [selectedSkill, setSelectedSkill] = useState<string>("ALL");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPending, startTransition] = useTransition();

  // 1-second interval to update acknowledgment countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks: Strictly include room repair/technical fixes and EXCLUDE missing item / cleanliness tickets
  const maintenanceTasks = reclamations.filter(
    (r) => !r.is_confidential && isMaintenanceFixTicket(r)
  );

  const filteredTasks = maintenanceTasks.filter((task) => {
    if (selectedTechId !== "ALL" && task.assigned_staff_id !== selectedTechId) return false;
    if (selectedSkill !== "ALL" && task.category !== selectedSkill) return false;
    return true;
  });

  const handleAcknowledge = (id: number) => {
    startTransition(async () => {
      await acknowledgeReclamation(
        id,
        typeof selectedTechId === "number" ? selectedTechId : undefined
      );
    });
  };

  const handleResolve = (id: number) => {
    startTransition(async () => {
      await resolveReclamation(id, resolutionNote);
      setResolvingId(null);
      setResolutionNote("");
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#38bdf8" }}>
            🔧 Technical Maintenance Task Queue
          </h2>
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontWeight: 700, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
            Room Repair Fixes Only
          </span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Room fix and repair dispatches. <em>(Note: Housekeeping & missing item tickets are excluded here and routed directly to Housekeeping & GM).</em>
        </p>
      </div>

      {/* Control / Filter Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Technician</label>
          <select
            value={selectedTechId}
            onChange={(e) => setSelectedTechId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13 }}
          >
            <option value="ALL">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} ({t.skill_tags.join(", ") || "General"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Filter by Skill / Category</label>
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13 }}
          >
            <option value="ALL">All Categories</option>
            <option value="A/C">A/C / HVAC</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical">Electrical</option>
            <option value="Lock">Locks / Hardware</option>
          </select>
        </div>
      </div>

      {/* Task Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredTasks.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", background: "rgba(30, 41, 59, 0.4)", borderRadius: 12, color: "#94a3b8" }}>
            🎉 No maintenance tasks pending right now!
          </div>
        ) : (
          filteredTasks.map((task) => {
            // Calculate 3-minute countdown from created_at
            const createdAtMs = task.created_at ? new Date(task.created_at).getTime() : currentTime;
            const elapsedSeconds = Math.floor((currentTime - createdAtMs) / 1000);
            const remainingSeconds = Math.max(0, 180 - elapsedSeconds);
            const isUrgent = remainingSeconds === 0 && task.status === "OPEN";

            return (
              <div
                key={task.id}
                style={{
                  padding: "16px",
                  borderRadius: 14,
                  background: isUrgent ? "rgba(239, 68, 68, 0.1)" : "rgba(30, 41, 59, 0.6)",
                  border: isUrgent ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>
                      Room #{task.room?.room_number || task.room_id}
                    </span>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#cbd5e1", fontWeight: 700 }}>
                      {task.category}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 700,
                        background: task.priority === "HIGH" || task.priority === "EMERGENCY" ? "rgba(239, 68, 68, 0.2)" : "rgba(56, 189, 248, 0.2)",
                        color: task.priority === "HIGH" || task.priority === "EMERGENCY" ? "#f87171" : "#38bdf8",
                      }}
                    >
                      {task.priority}
                    </span>

                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 700,
                        background: task.status === "RESOLVED" ? "rgba(34, 197, 94, 0.2)" : task.status === "IN_PROGRESS" ? "rgba(56, 189, 248, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: task.status === "RESOLVED" ? "#4ade80" : task.status === "IN_PROGRESS" ? "#38bdf8" : "#fbbf24",
                      }}
                    >
                      {task.status}
                    </span>
                  </div>

                  <p style={{ margin: "4px 0 8px", fontSize: 14, color: "#f8fafc" }}>
                    {task.description}
                  </p>

                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Assigned: <strong style={{ color: "#cbd5e1" }}>{task.assigned_to?.full_name || "Auto-routed"}</strong>
                  </div>
                </div>

                {/* Right Action & Countdown */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  {task.status === "OPEN" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isUrgent ? "#f87171" : "#fbbf24", fontWeight: 700 }}>
                      <span>⏱️ 3-min Acknowledge:</span>
                      <span>
                        {remainingSeconds > 0
                          ? `${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, "0")}`
                          : "⚠️ Overdue Auto-Reassign"}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    {task.status === "OPEN" && (
                      <button
                        disabled={isPending}
                        onClick={() => handleAcknowledge(task.id)}
                        style={{ padding: "8px 14px", borderRadius: 8, background: "#0284c7", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                      >
                        ✋ Acknowledge Task
                      </button>
                    )}

                    {task.status === "IN_PROGRESS" && resolvingId !== task.id && (
                      <button
                        onClick={() => setResolvingId(task.id)}
                        style={{ padding: "8px 14px", borderRadius: 8, background: "#16a34a", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                      >
                        ✔️ Mark Resolved
                      </button>
                    )}
                  </div>

                  {resolvingId === task.id && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#0f172a", padding: 10, borderRadius: 8, border: "1px solid #334155" }}>
                      <input
                        type="text"
                        placeholder="Resolution note (e.g. Replaced fuse)..."
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        style={{ padding: 6, borderRadius: 4, background: "#1e293b", border: "1px solid #475569", color: "#fff", fontSize: 12 }}
                      />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setResolvingId(null)}
                          style={{ padding: "4px 8px", borderRadius: 4, background: "transparent", border: "1px solid #64748b", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => handleResolve(task.id)}
                          style={{ padding: "4px 10px", borderRadius: 4, background: "#16a34a", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          Confirm Resolved
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
