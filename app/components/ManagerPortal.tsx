"use client";

import React, { useState, useTransition, useMemo } from "react";
import { HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import { resolveConfidentialGrievance, cycleRoomCleaning, resolveReclamation, logoutRole } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  reclamations: Reclamation[];
  staff: Staff[];
  isLiveSupabase?: boolean;
}

export default function ManagerPortal({ rooms, reclamations, staff }: Props) {
  const [activeTab, setActiveTab] = useState<"STATS" | "ROOMS" | "RECLAMATIONS">("STATS");
  const [ticketFilter, setTicketFilter] = useState<string>("ALL");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("ALL");
  const [remedyNote, setRemedyNote] = useState("");
  const [selectedRecId, setSelectedRecId] = useState<number | null>(null);

  // Matrix Filter & Room Details Modal State
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixFloorFilter, setMatrixFloorFilter] = useState<number | "ALL">("ALL");
  const [matrixStatusFilter, setMatrixStatusFilter] = useState<string>("ALL");
  const [selectedRoomModal, setSelectedRoomModal] = useState<HotelRoom | null>(null);

  const [isPending, startTransition] = useTransition();

  // Live Room Statistics
  const totalRooms = rooms.length;
  const occupiedRoomsCount = useMemo(() => rooms.filter((r) => r.is_occupied).length, [rooms]);
  const vacantCleanCount = useMemo(() => rooms.filter((r) => !r.is_occupied && r.cleaning_status === "CLEAN").length, [rooms]);
  const dirtyRoomsCount = useMemo(() => rooms.filter((r) => r.cleaning_status === "DIRTY").length, [rooms]);
  const cleaningCount = useMemo(() => rooms.filter((r) => r.cleaning_status === "CLEANING" || r.cleaning_status === "INSPECTING").length, [rooms]);

  // Rooms with active tickets
  const roomsWithActiveTickets = useMemo(() => {
    const set = new Set<string>();
    reclamations.forEach((r) => {
      if (r.status !== "RESOLVED") {
        set.add(r.room?.room_number || String(r.room_id));
      }
    });
    return set;
  }, [reclamations]);

  // Filter matrix rooms
  const filteredMatrixRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (matrixSearch && !r.room_number.includes(matrixSearch)) return false;
      if (matrixFloorFilter !== "ALL" && r.floor !== matrixFloorFilter) return false;
      if (matrixStatusFilter === "OCCUPIED" && !r.is_occupied) return false;
      if (matrixStatusFilter === "VACANT_CLEAN" && (r.is_occupied || r.cleaning_status !== "CLEAN")) return false;
      if (matrixStatusFilter === "DIRTY" && r.cleaning_status !== "DIRTY") return false;
      if (matrixStatusFilter === "CLEANING" && r.cleaning_status !== "CLEANING" && r.cleaning_status !== "INSPECTING") return false;
      if (matrixStatusFilter === "REPAIR_NEEDED" && !roomsWithActiveTickets.has(r.room_number)) return false;
      return true;
    });
  }, [rooms, matrixSearch, matrixFloorFilter, matrixStatusFilter, roomsWithActiveTickets]);

  const handleAdvanceRoomState = (room: HotelRoom) => {
    const nextMap: Record<string, "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN"> = {
      DIRTY: "CLEANING",
      CLEANING: "INSPECTING",
      INSPECTING: "CLEAN",
      CLEAN: "DIRTY",
    };
    const next = nextMap[room.cleaning_status] || "DIRTY";
    startTransition(async () => {
      await cycleRoomCleaning(room.id, next);
      setSelectedRoomModal((prev) => (prev ? { ...prev, cleaning_status: next } : null));
    });
  };

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

  // Repeat issue hotspot rooms
  const roomTicketCounts: Record<string, number> = {};
  reclamations.forEach((r) => {
    const num = r.room?.room_number || String(r.room_id);
    roomTicketCounts[num] = (roomTicketCounts[num] || 0) + 1;
  });
  const hotspotRooms = Object.entries(roomTicketCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const confidentialGrievances = reclamations.filter((r) => r.is_confidential);

  const filteredReclamations = reclamations.filter((r) => {
    if (ticketFilter !== "ALL" && r.department !== ticketFilter) return false;
    if (ticketStatusFilter !== "ALL" && r.status !== ticketStatusFilter) return false;
    return true;
  });

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

  const handleResolveNormalTicket = (id: number) => {
    startTransition(async () => {
      await resolveReclamation(id, "Resolved by General Manager Oversight");
    });
  };

  // Department counts
  const deptCounts: Record<string, number> = {};
  reclamations.forEach((r) => {
    deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Executive Header */}
      <div style={{ background: "rgba(20, 16, 41, 0.85)", padding: "1.25rem 1.5rem", borderRadius: 16, border: "1px solid rgba(251, 191, 36, 0.25)", boxShadow: "0 10px 30px rgba(251, 191, 36, 0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.3)", color: "#fbbf24", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span>👔 GENERAL MANAGER EXECUTIVE DASHBOARD</span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Palace Executive Oversight & Operations Analytics
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Imperial Gold Theme: view operational graphs & stats, inspect room states, and manage executive reclamations.
            </p>
          </div>

          <div>
            <button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await logoutRole();
                  window.location.href = "/login";
                });
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(239, 68, 68, 0.4)",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🔒</span> Log Out
            </button>
          </div>
        </div>

        {/* Quick Executive KPI Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Occupancy Rate</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>{Math.round((occupiedRoomsCount / (totalRooms || 1)) * 100)}%</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>SLA Compliance</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: slaCompliance >= 90 ? "#4ade80" : "#f87171" }}>{slaCompliance}%</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Avg MTTR</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{mttrMinutes} min</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Active Tickets</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: totalOpen > 0 ? "#f87171" : "#4ade80" }}>{totalOpen}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Confidential Desk</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: confidentialGrievances.length > 0 ? "#e879f9" : "#4ade80" }}>{confidentialGrievances.length}</div>
          </div>
        </div>

        {/* 3 MAIN SEPARATED TABS */}
        <div style={{ display: "flex", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
          <button
            onClick={() => setActiveTab("STATS")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "STATS" ? "#fbbf24" : "rgba(255,255,255,0.08)",
              background: activeTab === "STATS" ? "rgba(251, 191, 36, 0.25)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "STATS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "STATS" ? "0 4px 15px rgba(251, 191, 36, 0.3)" : "none",
            }}
          >
            <span>📊</span> 1. Stats & Graphs
          </button>
          <button
            onClick={() => setActiveTab("ROOMS")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "ROOMS" ? "#38bdf8" : "rgba(255,255,255,0.08)",
              background: activeTab === "ROOMS" ? "rgba(56, 189, 248, 0.25)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "ROOMS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "ROOMS" ? "0 4px 15px rgba(56, 189, 248, 0.3)" : "none",
            }}
          >
            <span>🏨</span> 2. Rooms ({totalRooms})
          </button>
          <button
            onClick={() => setActiveTab("RECLAMATIONS")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "RECLAMATIONS" ? "#e879f9" : "rgba(255,255,255,0.08)",
              background: activeTab === "RECLAMATIONS" ? "rgba(232, 121, 249, 0.25)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "RECLAMATIONS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "RECLAMATIONS" ? "0 4px 15px rgba(232, 121, 249, 0.3)" : "none",
            }}
          >
            <span>🛎️</span> 3. Reclamations ({reclamations.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STATS & GRAPHS */}
      {/* ========================================================================= */}
      {activeTab === "STATS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* VISUAL EXECUTIVE KPI CHARTS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
            {/* GRAPH 1: OCCUPANCY RING */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#fbbf24" }}>
                🟡 Hotel Occupancy Distribution Graph
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <svg width="120" height="120" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.8" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3.8"
                    strokeDasharray={`${Math.round((occupiedRoomsCount / (totalRooms || 1)) * 100)}, 100`}
                  />
                  <text x="18" y="20.35" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">
                    {Math.round((occupiedRoomsCount / (totalRooms || 1)) * 100)}%
                  </text>
                </svg>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fbbf24", fontWeight: 700 }}>Occupied:</span>
                    <strong style={{ color: "#fff" }}>{occupiedRoomsCount}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>Vacant Clean:</span>
                    <strong style={{ color: "#fff" }}>{vacantCleanCount}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#f87171", fontWeight: 700 }}>Dirty Rooms:</span>
                    <strong style={{ color: "#fff" }}>{dirtyRoomsCount}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* GRAPH 2: SLA & MTTR RESPONSE GAUGE */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#38bdf8" }}>
                ⏱️ SLA Compliance & Resolution Speed Graph
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <svg width="120" height="120" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.8" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="3.8"
                    strokeDasharray={`${slaCompliance}, 100`}
                  />
                  <text x="18" y="20.35" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">
                    {slaCompliance}%
                  </text>
                </svg>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>SLA Compliance:</span>
                    <strong style={{ color: "#fff" }}>{slaCompliance}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>Average MTTR:</span>
                    <strong style={{ color: "#fff" }}>{mttrMinutes} min</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* GRAPH 3: DEPARTMENT WORKLOAD BARS */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#e879f9" }}>
                🏢 Department Ticket Volume Comparison
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(deptCounts).map(([dept, count]) => {
                  const maxCount = Math.max(...Object.values(deptCounts), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={dept}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "#cbd5e1" }}>
                        <span>{dept}</span>
                        <strong style={{ color: "#e879f9" }}>{count} tickets</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #d97706, #fbbf24)", borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* REPEAT ISSUE HOTSPOTS */}
          {hotspotRooms.length > 0 && (
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 700, color: "#f87171" }}>
                🔥 Room Issue Hotspots (Rooms with Multiple Reclamations)
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {hotspotRooms.map(([roomNum, count]) => (
                  <div key={roomNum} style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 10, padding: "10px" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#f87171" }}>Room {roomNum}</div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>{count} Reported Issues</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROOMS */}
      {/* ========================================================================= */}
      {activeTab === "ROOMS" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
                🔑 Executive Live Room State Matrix ({filteredMatrixRooms.length} rooms)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Property room statuses across all 3 floors & blocks.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Search room #..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              />

              <select
                value={matrixFloorFilter}
                onChange={(e) => setMatrixFloorFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              >
                <option value="ALL">All Floors</option>
                <option value={1}>Floor 1</option>
                <option value={2}>Floor 2</option>
                <option value={3}>Floor 3</option>
              </select>

              <select
                value={matrixStatusFilter}
                onChange={(e) => setMatrixStatusFilter(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OCCUPIED">Occupied Only</option>
                <option value="VACANT_CLEAN">Vacant Clean</option>
                <option value="DIRTY">Dirty Only</option>
                <option value="REPAIR_NEEDED">Repair Needed</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
            {filteredMatrixRooms.map((room) => {
              const isDirty = room.cleaning_status === "DIRTY";
              const isClean = room.cleaning_status === "CLEAN";
              const hasTicket = roomsWithActiveTickets.has(room.room_number);

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomModal(room)}
                  style={{
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid",
                    borderColor: hasTicket ? "#ef4444" : isDirty ? "rgba(239, 68, 68, 0.4)" : isClean ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "10px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>Room {room.room_number}</span>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: room.is_occupied ? "#f59e0b" : "#10b981", color: "#000", fontWeight: 800 }}>
                      {room.is_occupied ? "Occupied" : "Vacant"}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Floor {room.floor} • {room.block?.replace("_", " ") || "Main"}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isDirty ? "#f87171" : isClean ? "#4ade80" : "#fbbf24" }}>
                      {isDirty ? "🧹 DIRTY" : isClean ? "✨ CLEAN" : `🧼 ${room.cleaning_status}`}
                    </span>
                    {hasTicket && <span style={{ fontSize: 10, color: "#f87171", fontWeight: 800 }}>⚠️ Issue</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RECLAMATIONS */}
      {/* ========================================================================= */}
      {activeTab === "RECLAMATIONS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* CONFIDENTIAL EXECUTIVE DESK */}
          {confidentialGrievances.length > 0 && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 16, padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem", fontWeight: 800, color: "#f87171" }}>
                🔒 Executive Confidential Grievances ({confidentialGrievances.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {confidentialGrievances.map((rec) => (
                  <div key={rec.id} style={{ background: "rgba(15, 23, 42, 0.8)", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#f87171" }}>
                        #{rec.id} • Room {rec.room?.room_number || rec.room_id} [{rec.department}]
                      </div>
                      <div style={{ fontSize: 13, color: "#f8fafc", marginTop: 2 }}>{rec.category}: {rec.description}</div>
                    </div>

                    {rec.status !== "RESOLVED" && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {selectedRecId === rec.id ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              type="text"
                              placeholder="Remedy notes..."
                              value={remedyNote}
                              onChange={(e) => setRemedyNote(e.target.value)}
                              style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                            />
                            <button onClick={() => handleResolveConfidential(rec.id)} style={{ padding: "6px 12px", borderRadius: 6, background: "#10b981", border: "none", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                              Confirm Resolve
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setSelectedRecId(rec.id)} style={{ padding: "6px 12px", borderRadius: 6, background: "#ef4444", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                            Executive Resolve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RECLAMATIONS TABLE */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#e879f9" }}>
                🛎️ All Reclamations Log ({filteredReclamations.length})
              </h3>

              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={ticketFilter}
                  onChange={(e) => setTicketFilter(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                >
                  <option value="ALL">All Departments</option>
                  <option value="MAINTENANCE">Technical / Maintenance</option>
                  <option value="HOUSEKEEPING">Housekeeping</option>
                  <option value="FOOD_AND_BEVERAGE">F&B</option>
                  <option value="CONCIERGE">Concierge</option>
                  <option value="SECURITY">Security</option>
                </select>

                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open Only</option>
                  <option value="IN_PROGRESS">In Progress Only</option>
                  <option value="RESOLVED">Resolved Only</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.8)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                    <th style={{ padding: "10px" }}>ID / Room</th>
                    <th style={{ padding: "10px" }}>Department</th>
                    <th style={{ padding: "10px" }}>Category / Description</th>
                    <th style={{ padding: "10px" }}>Priority</th>
                    <th style={{ padding: "10px" }}>Status</th>
                    <th style={{ padding: "10px" }}>Assigned Staff</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>GM Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReclamations.map((rec) => {
                    const isResolved = rec.status === "RESOLVED";
                    return (
                      <tr key={rec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "#38bdf8" }}>
                          #{rec.id} • Room {rec.room?.room_number || rec.room_id}
                        </td>
                        <td style={{ padding: "10px", color: "#cbd5e1" }}>{rec.department}</td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: 700, color: "#f8fafc" }}>{rec.category}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{rec.description}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: rec.priority === "EMERGENCY" ? "#ef4444" : rec.priority === "HIGH" ? "#f59e0b" : "rgba(59,130,246,0.3)", color: "#fff" }}>
                            {rec.priority || "STANDARD"}
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: isResolved ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: isResolved ? "#4ade80" : "#f87171" }}>
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", color: "#94a3b8", fontSize: 12 }}>
                          {rec.assigned_to ? rec.assigned_to.full_name : "— Unassigned —"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          {!isResolved && (
                            <button
                              disabled={isPending}
                              onClick={() => handleResolveNormalTicket(rec.id)}
                              style={{ padding: "4px 8px", borderRadius: 6, background: "#10b981", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROOM DETAILS MODAL */}
      {selectedRoomModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 440, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#38bdf8" }}>🏨 Room {selectedRoomModal.room_number} Overview</h3>
              <button onClick={() => setSelectedRoomModal(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#cbd5e1" }}>
              <div><strong>Floor:</strong> Floor {selectedRoomModal.floor} ({selectedRoomModal.block?.replace("_", " ")})</div>
              <div><strong>Occupancy:</strong> {selectedRoomModal.is_occupied ? "Occupied (Guest In-House)" : "Vacant"}</div>
              <div><strong>Cleanliness:</strong> {selectedRoomModal.cleaning_status}</div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  disabled={isPending}
                  onClick={() => handleAdvanceRoomState(selectedRoomModal)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "#38bdf8", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}
                >
                  Advance Clean Status &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
