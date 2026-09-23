"use client";

import React, { useState, useTransition } from "react";
import { HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import { resolveConfidentialGrievance, createHistoricalReclamation } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  reclamations: Reclamation[];
  staff: Staff[];
}

export default function ManagerPortal({ rooms, reclamations, staff }: Props) {
  const [selectedSubTab, setSelectedSubTab] = useState<"matrix" | "confidential" | "backfill">("matrix");
  const [remedyNote, setRemedyNote] = useState("");
  const [selectedRecId, setSelectedRecId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Backfill form state
  const [bfRoom, setBfRoom] = useState("");
  const [bfDept, setBfDept] = useState<"MAINTENANCE" | "GOVERNANCE">("MAINTENANCE");
  const [bfCategory, setBfCategory] = useState("A/C");
  const [bfDate, setBfDate] = useState("2026-09-01");
  const [bfDesc, setBfDesc] = useState("");

  // KPI Calculations
  const resolvedTasks = reclamations.filter((r) => r.status === "RESOLVED" && r.created_at && r.resolved_at);
  const mttrMinutes = resolvedTasks.length > 0
    ? Math.round(
        resolvedTasks.reduce((acc, r) => {
          const diffMs = new Date(r.resolved_at!).getTime() - new Date(r.created_at!).getTime();
          return acc + diffMs / (1000 * 60);
        }, 0) / resolvedTasks.length
      )
    : 24;

  const totalOpen = reclamations.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;
  const slaCompliance = reclamations.length > 0
    ? Math.round(((reclamations.length - totalOpen) / reclamations.length) * 100)
    : 95;

  // Repeat issue hotspot rooms (rooms with more than 1 ticket)
  const roomTicketCounts: Record<string, number> = {};
  reclamations.forEach((r) => {
    const num = r.room?.room_number || String(r.room_id);
    roomTicketCounts[num] = (roomTicketCounts[num] || 0) + 1;
  });
  const hotspotRooms = Object.entries(roomTicketCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const confidentialGrievances = reclamations.filter((r) => r.is_confidential);

  const handleResolveConfidential = (id: number) => {
    if (!remedyNote.trim()) {
      alert("Please enter executive resolution / remedy notes!");
      return;
    }
    startTransition(async () => {
      await resolveConfidentialGrievance(id, remedyNote);
      setSelectedRecId(null);
      setRemedyNote("");
      alert("Confidential grievance marked as resolved by General Manager.");
    });
  };

  const handleBackfillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.room_number === bfRoom);
    if (!targetRoom) {
      alert("Invalid room number!");
      return;
    }
    startTransition(async () => {
      const res = await createHistoricalReclamation({
        roomId: targetRoom.id,
        department: bfDept,
        category: bfCategory,
        description: bfDesc || `Digitized paper logbook entry for Room ${bfRoom}`,
        status: "RESOLVED",
        createdAt: bfDate,
      });
      if (res.success) {
        alert(`Historical ticket digitized for Room ${bfRoom}!`);
        setBfDesc("");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#f59e0b" }}>
          📊 General Manager Executive Control
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Full 341-room live matrix, operational KPIs (MTTR & SLA), confidential guest grievances, and historical backfill tool.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ padding: "14px", borderRadius: 12, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Mean Time to Resolution (MTTR)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>{mttrMinutes} min</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Target: &lt; 30 minutes</div>
        </div>

        <div style={{ padding: "14px", borderRadius: 12, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>SLA Compliance Rate</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e", marginTop: 4 }}>{slaCompliance}%</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>On-time resolution metric</div>
        </div>

        <div style={{ padding: "14px", borderRadius: 12, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Repeat Issue Hotspots</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: hotspotRooms.length > 0 ? "#f87171" : "#4ade80", marginTop: 4 }}>
            {hotspotRooms.length} rooms
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {hotspotRooms.map(([num, c]) => `#${num} (${c})`).join(", ") || "No repeated issues"}
          </div>
        </div>

        <div style={{ padding: "14px", borderRadius: 12, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Confidential Grievances</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#eab308", marginTop: 4 }}>
            {confidentialGrievances.length} tickets
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Private GM escalation desk</div>
        </div>
      </div>

      {/* GM Sub-Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setSelectedSubTab("matrix")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: selectedSubTab === "matrix" ? "#f59e0b" : "rgba(255,255,255,0.1)",
            background: selectedSubTab === "matrix" ? "rgba(245, 158, 11, 0.15)" : "transparent",
            color: selectedSubTab === "matrix" ? "#fbbf24" : "#94a3b8",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🗺️ 341-Room Color Live Matrix
        </button>
        <button
          onClick={() => setSelectedSubTab("confidential")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: selectedSubTab === "confidential" ? "#f87171" : "rgba(255,255,255,0.1)",
            background: selectedSubTab === "confidential" ? "rgba(239, 68, 68, 0.15)" : "transparent",
            color: selectedSubTab === "confidential" ? "#f87171" : "#94a3b8",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🔒 Confidential Grievance Desk ({confidentialGrievances.length})
        </button>
        <button
          onClick={() => setSelectedSubTab("backfill")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: selectedSubTab === "backfill" ? "#38bdf8" : "rgba(255,255,255,0.1)",
            background: selectedSubTab === "backfill" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: selectedSubTab === "backfill" ? "#38bdf8" : "#94a3b8",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          📖 Historical Backfill Tool (/manager/backfill)
        </button>
      </div>

      {/* VIEW 1: 341-ROOM COLOR-CODED MATRIX */}
      {selectedSubTab === "matrix" && (
        <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#f8fafc" }}>Property-Wide 341-Room Status Matrix</h3>
            {/* Color Legend */}
            <div style={{ display: "flex", gap: 12, fontSize: 11, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#22c55e", borderRadius: 2 }}></span> Vacant & Clean
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#3b82f6", borderRadius: 2 }}></span> Occupied & Clean
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#f59e0b", borderRadius: 2 }}></span> Cleaning In Progress
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#ef4444", borderRadius: 2 }}></span> Dirty (Pending Housekeeping)
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
              gap: 4,
            }}
          >
            {rooms.map((room) => {
              let cellColor = "#22c55e"; // default vacant & clean
              if (room.is_occupied && room.cleaning_status === "CLEAN") cellColor = "#3b82f6";
              else if (room.cleaning_status === "CLEANING" || room.cleaning_status === "INSPECTING") cellColor = "#f59e0b";
              else if (room.cleaning_status === "DIRTY") cellColor = "#ef4444";

              return (
                <div
                  key={room.id}
                  title={`Room #${room.room_number} | Block ${room.block === "BLOCK_A" ? "A" : "B"} | Floor ${room.floor} | ${room.is_occupied ? "Occupied" : "Vacant"} | ${room.cleaning_status}`}
                  style={{
                    height: 32,
                    background: cellColor,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#000",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {room.room_number.slice(-3)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: CONFIDENTIAL GRIEVANCES */}
      {selectedSubTab === "confidential" && (
        <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#f87171" }}>
            🔒 Confidential Guest Grievances (Visible to GM & Reception Only)
          </h3>
          {confidentialGrievances.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>No confidential grievances pending review.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {confidentialGrievances.map((cg) => (
                <div key={cg.id} style={{ padding: 14, borderRadius: 10, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>
                      Room #{cg.room?.room_number || cg.room_id} • {cg.category}
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: cg.status === "RESOLVED" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: cg.status === "RESOLVED" ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                      {cg.status}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 10px 0", fontSize: 13, color: "#cbd5e1" }}>{cg.description}</p>

                  {cg.status !== "RESOLVED" && (
                    <div style={{ marginTop: 8 }}>
                      {selectedRecId === cg.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input
                            type="text"
                            placeholder="Executive remedy / resolution notes (e.g. Free dinner voucher & room upgrade)..."
                            value={remedyNote}
                            onChange={(e) => setRemedyNote(e.target.value)}
                            style={{ padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #475569", color: "#fff", fontSize: 12 }}
                          />
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => setSelectedRecId(null)} style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", border: "1px solid #64748b", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                            <button disabled={isPending} onClick={() => handleResolveConfidential(cg.id)} style={{ padding: "4px 12px", borderRadius: 6, background: "#16a34a", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Confirm Resolution</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setSelectedRecId(cg.id)} style={{ padding: "6px 12px", borderRadius: 6, background: "#f59e0b", border: "none", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                          ⚖️ Review & Resolve Grievance
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: HISTORICAL BACKFILL TOOL */}
      {selectedSubTab === "backfill" && (
        <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 16, color: "#38bdf8" }}>
            📖 Historical Paper Logbook Digitizer (/manager/backfill)
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#94a3b8" }}>
            Digitize paper maintenance sheets, guest complaint logs, and archive incident history into system analytics.
          </p>

          <form onSubmit={handleBackfillSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Room Number</label>
              <input
                type="text"
                required
                placeholder="e.g. 1001, 2071"
                value={bfRoom}
                onChange={(e) => setBfRoom(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department</label>
              <select
                value={bfDept}
                onChange={(e) => setBfDept(e.target.value as "MAINTENANCE" | "GOVERNANCE")}
                style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
              >
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="GOVERNANCE">GOVERNANCE</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Historical Date</label>
              <input
                type="date"
                required
                value={bfDate}
                onChange={(e) => setBfDate(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Category</label>
              <input
                type="text"
                required
                placeholder="e.g. A/C, Plumbing, TV, Bedding"
                value={bfCategory}
                onChange={(e) => setBfCategory(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Historical Notes</label>
              <input
                type="text"
                placeholder="Transcribe description from paper log..."
                value={bfDesc}
                onChange={(e) => setBfDesc(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={isPending}
                style={{ padding: "10px 20px", borderRadius: 8, background: "#0284c7", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}
              >
                📥 Digitize Paper Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
