"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Reclamation, Staff, isMaintenanceFixTicket } from "@/utils/roomsData";
import { acknowledgeReclamation, resolveReclamation } from "@/app/actions";

interface Props {
  reclamations: Reclamation[];
  technicians: Staff[];
  isLiveSupabase?: boolean;
}

export default function MaintenancePortal({ reclamations, technicians, isLiveSupabase = false }: Props) {
  const router = useRouter();
  const [selectedTechId, setSelectedTechId] = useState<number | "ALL">("ALL");
  const [filterFloor, setFilterFloor] = useState<number | "ALL">("ALL");
  const [selectedSkill, setSelectedSkill] = useState<string>("ALL");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPending, startTransition] = useTransition();

  // Real-time synchronization
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-maintenance")
      .on("postgres_changes", { event: "*", schema: "public", table: "reclamations" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLiveSupabase, router]);

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
      <div className="ses-card" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--accent-amber)" }}>
            🔧 Technical Maintenance Task Queue
          </h2>
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: "var(--accent-amber-bg)", color: "var(--accent-amber)", fontWeight: 700, border: "1px solid var(--accent-amber)" }}>
            Room Repair Fixes Only
          </span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Room fix and repair dispatches. <em>(Note: Housekeeping & missing item tickets are excluded here and routed directly to Housekeeping & GM).</em>
        </p>
      </div>

      {/* Control / Filter Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Technician</label>
          <select
            value={selectedTechId}
            onChange={(e) => setSelectedTechId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
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
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Filter by Skill / Category</label>
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
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
          <div className="ses-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
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
                className="mobile-ticket-card"
                style={{
                  background: isUrgent ? "var(--status-rose-bg)" : "var(--surface-card)",
                  border: isUrgent ? "1.5px solid var(--status-rose)" : "1px solid var(--border-default)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-amber)" }}>
                      Room #{task.room?.room_number || task.room_id}
                    </span>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-secondary)", fontWeight: 700 }}>
                      {task.category}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 700,
                        background: task.priority === "HIGH" || task.priority === "EMERGENCY" ? "var(--status-rose-bg)" : "var(--status-amber-bg)",
                        color: task.priority === "HIGH" || task.priority === "EMERGENCY" ? "var(--status-rose)" : "var(--status-amber)",
                        border: `1px solid ${task.priority === "HIGH" || task.priority === "EMERGENCY" ? "var(--status-rose)" : "var(--status-amber)"}`,
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
                        background: task.status === "RESOLVED" ? "var(--status-emerald-bg)" : task.status === "IN_PROGRESS" ? "var(--accent-amber-bg)" : "var(--status-amber-bg)",
                        color: task.status === "RESOLVED" ? "var(--status-emerald)" : task.status === "IN_PROGRESS" ? "var(--accent-amber)" : "var(--status-amber)",
                      }}
                    >
                      {task.status}
                    </span>
                  </div>

                  <p style={{ margin: "4px 0 8px", fontSize: 14, color: "var(--text-primary)" }}>
                    {task.description}
                  </p>

                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Assigned: <strong style={{ color: "var(--text-secondary)" }}>{task.assigned_to?.full_name || "Auto-routed"}</strong>
                  </div>
                </div>

                {/* Right Action & Countdown */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginTop: 8 }}>
                  {task.status === "OPEN" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isUrgent ? "var(--status-rose)" : "var(--status-amber)", fontWeight: 700 }}>
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
                        style={{ padding: "8px 14px", borderRadius: 8, background: "var(--accent-amber)", border: "none", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                      >
                        ✋ Acknowledge Task
                      </button>
                    )}

                    {task.status === "IN_PROGRESS" && resolvingId !== task.id && (
                      <button
                        onClick={() => setResolvingId(task.id)}
                        style={{ padding: "8px 14px", borderRadius: 8, background: "var(--status-emerald)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                      >
                        ✔️ Mark Resolved
                      </button>
                    )}
                  </div>

                  {resolvingId === task.id && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-2)", padding: 10, borderRadius: 8, border: "1px solid var(--border-default)" }}>
                      <input
                        type="text"
                        placeholder="Resolution note (e.g. Replaced fuse)..."
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        style={{ padding: 6, borderRadius: 4, background: "var(--surface-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 12 }}
                      />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setResolvingId(null)}
                          style={{ padding: "4px 8px", borderRadius: 4, background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => handleResolve(task.id)}
                          style={{ padding: "4px 10px", borderRadius: 4, background: "var(--status-emerald)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
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
