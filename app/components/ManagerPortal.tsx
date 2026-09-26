"use client";

import React, { useState, useTransition, useMemo } from "react";
import { HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import {
  resolveConfidentialGrievance,
  cycleRoomCleaning,
  resolveReclamation,
  updateRoomStayState,
  createRapidReclamation,
  logoutRole,
} from "@/app/actions";

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
  const [message, setMessage] = useState<string | null>(null);

  // Matrix Filter & Room Details Modal State
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixFloorFilter, setMatrixFloorFilter] = useState<number | "ALL">("ALL");
  const [matrixStatusFilter, setMatrixStatusFilter] = useState<string>("ALL");

  // Room Pop-up Modal State
  const [selectedRoomModal, setSelectedRoomModal] = useState<HotelRoom | null>(null);
  const [modalTab, setModalTab] = useState<"RECLAMATIONS" | "ROOM_STAT">("ROOM_STAT");
  const [modalDept, setModalDept] = useState<string>("TECHNICAL");
  const [modalDesc, setModalDesc] = useState<string>("");

  const [isPending, startTransition] = useTransition();

  // Live Room Statistics
  const totalRooms = rooms.length;
  const occupiedRoomsCount = useMemo(() => rooms.filter((r) => r.is_occupied).length, [rooms]);
  const vacantCleanCount = useMemo(() => rooms.filter((r) => !r.is_occupied && r.cleaning_status === "CLEAN").length, [rooms]);
  const dirtyRoomsCount = useMemo(() => rooms.filter((r) => r.cleaning_status === "DIRTY").length, [rooms]);

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
      if (matrixStatusFilter === "REPAIR_NEEDED" && !roomsWithActiveTickets.has(r.room_number)) return false;
      return true;
    });
  }, [rooms, matrixSearch, matrixFloorFilter, matrixStatusFilter, roomsWithActiveTickets]);

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

  const confidentialGrievances = reclamations.filter((r) => r.is_confidential);

  const filteredReclamations = reclamations.filter((r) => {
    if (ticketFilter !== "ALL" && r.department !== ticketFilter) return false;
    if (ticketStatusFilter !== "ALL" && r.status !== ticketStatusFilter) return false;
    return true;
  });

  const [roomModalSubTab, setRoomModalSubTab] = useState<"ACTIVE" | "MOST_REPORTED" | "HISTORY">("ACTIVE");

  // Specific Room Reclamations
  const roomModalReclamations = useMemo(() => {
    if (!selectedRoomModal) return [];
    return reclamations.filter(
      (r) => r.room_id === selectedRoomModal.id || r.room?.room_number === selectedRoomModal.room_number
    );
  }, [reclamations, selectedRoomModal]);

  // Active Reclamations for Room Modal
  const roomActiveReclamations = useMemo(() => {
    return roomModalReclamations.filter(
      (r) => r.status === "OPEN" || r.status === "IN_PROGRESS"
    );
  }, [roomModalReclamations]);

  // Most Reported Problem Categories for Room Modal
  const roomProblemStats = useMemo(() => {
    if (!selectedRoomModal) return [];
    const counts: Record<string, { count: number; department: string; lastDate?: string }> = {};
    roomModalReclamations.forEach((rec) => {
      const cat = rec.category || "General";
      if (!counts[cat]) {
        counts[cat] = { count: 0, department: rec.department, lastDate: rec.created_at };
      }
      counts[cat].count += 1;
    });
    const total = roomModalReclamations.length || 1;
    return Object.entries(counts)
      .map(([category, info]) => ({
        category,
        count: info.count,
        department: info.department,
        percentage: Math.round((info.count / total) * 100),
        lastDate: info.lastDate,
      }))
      .sort((a, b) => b.count - a.count);
  }, [roomModalReclamations, selectedRoomModal]);

  // Handlers
  const handleResolveConfidential = (id: number) => {
    if (!remedyNote.trim()) {
      alert("Please enter executive resolution notes!");
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

  const handleStayState = (roomId: number, state: "OCCUPIED" | "VACANT_DIRTY" | "RESERVED") => {
    startTransition(async () => {
      const res = await updateRoomStayState(roomId, state);
      if (res.success) {
        setMessage(`✅ Room state updated!`);
        if (selectedRoomModal) {
          setSelectedRoomModal((prev) => (prev ? { ...prev, is_occupied: state === "OCCUPIED" } : null));
        }
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleCleaningCycle = (room: HotelRoom) => {
    const nextMap: Record<string, "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN"> = {
      DIRTY: "CLEANING",
      CLEANING: "INSPECTING",
      INSPECTING: "CLEAN",
      CLEAN: "DIRTY",
    };
    const nextStatus = nextMap[room.cleaning_status] || "DIRTY";
    startTransition(async () => {
      const res = await cycleRoomCleaning(room.id, nextStatus);
      if (res.success) {
        setMessage(`🧹 Room ${room.room_number} set to ${nextStatus}!`);
        if (selectedRoomModal && selectedRoomModal.id === room.id) {
          setSelectedRoomModal((prev) => (prev ? { ...prev, cleaning_status: nextStatus } : null));
        }
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleModalCreateReclamation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomModal) return;

    startTransition(async () => {
      const res = await createRapidReclamation({
        roomId: selectedRoomModal.id,
        department: modalDept,
        category: "Executive",
        description: modalDesc.trim() || `GM Executive Ticket for Room ${selectedRoomModal.room_number}`,
      });

      if (res.success) {
        setMessage(`✅ Ticket created for Room ${selectedRoomModal.room_number}!`);
        setModalDesc("");
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const deptCounts: Record<string, number> = {};
  reclamations.forEach((r) => {
    deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", gap: "1.5rem", padding: "1.25rem" }}>
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside
        style={{
          width: 270,
          flexShrink: 0,
          background: "rgba(20, 16, 41, 0.85)",
          border: "1px solid rgba(251, 191, 36, 0.25)",
          borderRadius: 20,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 10px 30px rgba(251, 191, 36, 0.15)",
        }}
      >
        <div>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.3)", color: "#fbbf24", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              <span>👔 GM EXECUTIVE PORTAL</span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              General Manager
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Imperial Gold Lounge Theme
            </p>
          </div>

          {/* VERTICAL NAV TABS */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.5rem" }}>
            {[
              { id: "STATS", label: "📊 1. Stats & Graphs", count: null, color: "#fbbf24" },
              { id: "ROOMS", label: "🏨 2. Rooms Map", count: totalRooms, color: "#38bdf8" },
              { id: "RECLAMATIONS", label: "🛎️ 3. Reclamations", count: reclamations.length, color: "#e879f9" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid",
                    borderColor: isActive ? tab.color : "rgba(255, 255, 255, 0.06)",
                    background: isActive ? `rgba(251, 191, 36, 0.2)` : "rgba(15, 23, 42, 0.5)",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: isActive ? tab.color : "rgba(255, 255, 255, 0.1)", color: isActive ? "#000" : "#cbd5e1", fontSize: 11, fontWeight: 800 }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* STACKED EXECUTIVE KPIS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Occupancy Rate</span>
              <strong style={{ fontSize: 14, color: "#fbbf24" }}>{Math.round((occupiedRoomsCount / (totalRooms || 1)) * 100)}%</strong>
            </div>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>SLA Compliance</span>
              <strong style={{ fontSize: 14, color: "#4ade80" }}>{slaCompliance}%</strong>
            </div>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Average MTTR</span>
              <strong style={{ fontSize: 14, color: "#38bdf8" }}>{mttrMinutes} min</strong>
            </div>
          </div>
        </div>

        {/* SIDEBAR FOOTER */}
        <div style={{ marginTop: "1.5rem" }}>
          <button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await logoutRole();
                window.location.href = "/login";
              });
            }}
            style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            🔒 Log Out & Exit
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT */}
      {/* ========================================================================= */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {message && (
          <div style={{ marginBottom: "1rem", padding: "10px 14px", borderRadius: 10, background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.3)", color: "#fbbf24", fontSize: 14, fontWeight: 600 }}>
            {message}
          </div>
        )}

        {/* TAB 1: STATS & GRAPHS */}
        {activeTab === "STATS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fbbf24", fontWeight: 700 }}>Occupied:</span><strong style={{ color: "#fff" }}>{occupiedRoomsCount}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4ade80", fontWeight: 700 }}>Vacant Clean:</span><strong style={{ color: "#fff" }}>{vacantCleanCount}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#f87171", fontWeight: 700 }}>Dirty Rooms:</span><strong style={{ color: "#fff" }}>{dirtyRoomsCount}</strong></div>
                </div>
              </div>
            </div>

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
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#4ade80", fontWeight: 700 }}>SLA Compliance:</span><strong style={{ color: "#fff" }}>{slaCompliance}%</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#38bdf8", fontWeight: 700 }}>Average MTTR:</span><strong style={{ color: "#fff" }}>{mttrMinutes} min</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS MAP */}
        {activeTab === "ROOMS" && (
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
              🔑 Executive Rooms Matrix ({filteredMatrixRooms.length} rooms)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, maxHeight: 600, overflowY: "auto" }}>
              {filteredMatrixRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomModal(room);
                    setModalTab("ROOM_STAT");
                  }}
                  style={{
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: 10,
                    padding: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#fff" }}>
                    <span>Room {room.room_number}</span>
                    <span style={{ fontSize: 10, color: room.is_occupied ? "#fbbf24" : "#4ade80" }}>{room.is_occupied ? "Occupied" : "Vacant"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Floor {room.floor}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RECLAMATIONS */}
        {activeTab === "RECLAMATIONS" && (
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "#e879f9" }}>
              🛎️ All Reclamations Log ({filteredReclamations.length})
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.8)", color: "#94a3b8" }}>
                    <th style={{ padding: "10px" }}>ID / Room</th>
                    <th style={{ padding: "10px" }}>Department</th>
                    <th style={{ padding: "10px" }}>Category / Description</th>
                    <th style={{ padding: "10px" }}>Status</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>GM Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReclamations.map((rec) => (
                    <tr key={rec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#38bdf8" }}>#{rec.id} • Room {rec.room?.room_number || rec.room_id}</td>
                      <td style={{ padding: "10px", color: "#cbd5e1" }}>{rec.department}</td>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 700, color: "#fff" }}>{rec.category}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{rec.description}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: rec.status === "RESOLVED" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: rec.status === "RESOLVED" ? "#4ade80" : "#f87171" }}>
                          {rec.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        {rec.status !== "RESOLVED" && (
                          <button onClick={() => handleResolveNormalTicket(rec.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "#10b981", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ROOM POP-UP MODAL */}
      {selectedRoomModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1.5px solid rgba(251, 191, 36, 0.4)", borderRadius: 20, maxWidth: 840, width: "100%", height: 560, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "rgba(30, 41, 59, 0.9)", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#ffffff" }}>
                Room {selectedRoomModal.room_number} Executive Inspection
              </h3>
              <button onClick={() => setSelectedRoomModal(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* MODAL SIDEBAR */}
              <div style={{ width: 210, background: "rgba(15, 23, 42, 0.9)", borderRight: "1px solid rgba(255,255,255,0.08)", padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => setModalTab("ROOM_STAT")}
                  style={{ padding: "10px", borderRadius: 10, border: "1px solid", borderColor: modalTab === "ROOM_STAT" ? "#fbbf24" : "transparent", background: modalTab === "ROOM_STAT" ? "rgba(251, 191, 36, 0.2)" : "transparent", color: modalTab === "ROOM_STAT" ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 700, textAlign: "left", cursor: "pointer" }}
                >
                  📊 1. Room Stat
                </button>
                <button
                  onClick={() => setModalTab("RECLAMATIONS")}
                  style={{ padding: "10px", borderRadius: 10, border: "1px solid", borderColor: modalTab === "RECLAMATIONS" ? "#e879f9" : "transparent", background: modalTab === "RECLAMATIONS" ? "rgba(232, 121, 249, 0.2)" : "transparent", color: modalTab === "RECLAMATIONS" ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 700, textAlign: "left", cursor: "pointer" }}
                >
                  🛎️ 2. Reclamations ({roomModalReclamations.length})
                </button>
              </div>

              {/* MODAL CONTENT */}
              <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto" }}>
                {modalTab === "ROOM_STAT" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 15, color: "#fbbf24", fontWeight: 800 }}>📊 Executive Room Overview</h4>
                    <div style={{ fontSize: 13, color: "#cbd5e1" }}>Occupancy: {selectedRoomModal.is_occupied ? "Occupied" : "Vacant"}</div>
                    <div style={{ fontSize: 13, color: "#cbd5e1" }}>Cleanliness: {selectedRoomModal.cleaning_status}</div>
                    <button onClick={() => handleCleaningCycle(selectedRoomModal)} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "rgba(251, 191, 36, 0.2)", border: "1px solid #fbbf24", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                      🧹 Cycle Cleaning Status &rarr;
                    </button>
                  </div>
                )}

                {/* MODAL TAB 2: RECLAMATIONS WITH SUB-CATEGORIES */}
                {modalTab === "RECLAMATIONS" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* SUB-CATEGORY TAB SWITCHER FOR ROOM RECLAMATIONS */}
                    <div style={{ display: "flex", gap: 8, padding: "4px", background: "rgba(15, 23, 42, 0.8)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                      <button
                        onClick={() => setRoomModalSubTab("ACTIVE")}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "ACTIVE" ? "#fbbf24" : "transparent",
                          color: roomModalSubTab === "ACTIVE" ? "#000000" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>⚡ Active Issues</span>
                        {roomActiveReclamations.length > 0 && (
                          <span style={{ padding: "1px 6px", borderRadius: 999, background: roomModalSubTab === "ACTIVE" ? "rgba(0,0,0,0.2)" : "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                            {roomActiveReclamations.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setRoomModalSubTab("MOST_REPORTED")}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "MOST_REPORTED" ? "#38bdf8" : "transparent",
                          color: roomModalSubTab === "MOST_REPORTED" ? "#000000" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>💥 Most Reported</span>
                        <span style={{ padding: "1px 6px", borderRadius: 999, background: roomModalSubTab === "MOST_REPORTED" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)", color: roomModalSubTab === "MOST_REPORTED" ? "#000" : "#cbd5e1", fontSize: 10, fontWeight: 800 }}>
                          {roomProblemStats.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setRoomModalSubTab("HISTORY")}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "HISTORY" ? "#e879f9" : "transparent",
                          color: roomModalSubTab === "HISTORY" ? "#000000" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>📜 Full History</span>
                        <span style={{ padding: "1px 6px", borderRadius: 999, background: roomModalSubTab === "HISTORY" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)", color: roomModalSubTab === "HISTORY" ? "#000" : "#cbd5e1", fontSize: 10, fontWeight: 800 }}>
                          {roomModalReclamations.length}
                        </span>
                      </button>
                    </div>

                    {/* SUB-CATEGORY 1: ACTIVE PROBLEMS (IF EXIST) */}
                    {roomModalSubTab === "ACTIVE" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "#fbbf24", fontWeight: 800 }}>
                          ⚡ Active Executive Reclamations ({roomActiveReclamations.length})
                        </h4>

                        {roomActiveReclamations.length === 0 ? (
                          <div style={{ padding: "12px", borderRadius: 10, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#4ade80", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>✅</span>
                            <span>No active problems recorded for Room {selectedRoomModal.room_number}. Operations normal.</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {roomActiveReclamations.map((rec) => (
                              <div key={rec.id} style={{ background: "rgba(30, 41, 59, 0.7)", padding: "12px", borderRadius: 10, border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>#{rec.id} • {rec.category}</span>
                                    <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(251, 191, 36, 0.2)", color: "#fbbf24" }}>{rec.department}</span>
                                  </div>
                                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "OPEN" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", color: rec.status === "OPEN" ? "#f87171" : "#fbbf24", fontWeight: 800, border: "1px solid currentColor" }}>
                                    {rec.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{rec.description}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CREATE RECLAMATION FORM */}
                        <form onSubmit={handleModalCreateReclamation} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24" }}>➕ Log Executive Dispatch for Room {selectedRoomModal.room_number}</div>
                          <select
                            value={modalDept}
                            onChange={(e) => setModalDept(e.target.value)}
                            style={{ padding: "6px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                          >
                            <option value="TECHNICAL">Technical Maintenance</option>
                            <option value="HOUSEKEEPING">Housekeeping</option>
                            <option value="FOOD_AND_BEVERAGE">Food & Beverage</option>
                            <option value="CONCIERGE">Concierge</option>
                            <option value="SECURITY">Security</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Executive directive note..."
                            value={modalDesc}
                            onChange={(e) => setModalDesc(e.target.value)}
                            style={{ padding: "8px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                          />
                          <button
                            type="submit"
                            disabled={isPending}
                            style={{ padding: "8px", borderRadius: 8, background: "#fbbf24", border: "none", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 12 }}
                          >
                            Dispatch Directive &rarr;
                          </button>
                        </form>
                      </div>
                    )}

                    {/* SUB-CATEGORY 2: MOST REPORTED PROBLEMS */}
                    {roomModalSubTab === "MOST_REPORTED" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "#38bdf8", fontWeight: 800 }}>
                          💥 Most Reported Problem Categories
                        </h4>

                        {roomProblemStats.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            No problem patterns recorded for Room {selectedRoomModal.room_number} yet.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {roomProblemStats.map((stat) => (
                              <div key={stat.category} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: 10, border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>{stat.category}</span>
                                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>({stat.department})</span>
                                  </div>
                                  <span style={{ fontWeight: 800, color: "#38bdf8", fontSize: 13 }}>{stat.count} Reports</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                                  <div style={{ width: `${stat.percentage}%`, height: "100%", background: "linear-gradient(90deg, #0284c7, #38bdf8)" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-CATEGORY 3: FULL HISTORY FOR EACH ROOM */}
                    {roomModalSubTab === "HISTORY" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "#e879f9", fontWeight: 800 }}>
                          📜 Complete Room {selectedRoomModal.room_number} Ticket History ({roomModalReclamations.length})
                        </h4>

                        {roomModalReclamations.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            No past or historical tickets logged for Room {selectedRoomModal.room_number}.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                            {roomModalReclamations.map((rec) => (
                              <div key={rec.id} style={{ background: "rgba(30, 41, 59, 0.5)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                                    #{rec.id} • {rec.category} <span style={{ color: "#fbbf24", fontWeight: 600 }}>({rec.department})</span>
                                  </div>
                                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>{rec.description}</div>
                                </div>
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "RESOLVED" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: rec.status === "RESOLVED" ? "#4ade80" : "#f87171", fontWeight: 800 }}>
                                  {rec.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
