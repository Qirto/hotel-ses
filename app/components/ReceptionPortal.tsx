"use client";

import React, { useState, useTransition, useMemo } from "react";
import { HotelRoom, Resident, Department, Reclamation, Staff } from "@/utils/roomsData";
import {
  createRapidReclamation,
  createHistoricalReclamation,
  updateRoomStayState,
  acknowledgeReclamation,
  resolveReclamation,
  cycleRoomCleaning,
  updateRoomHeadcount,
  logoutRole,
} from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  residents?: Resident[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  staffList?: Staff[];
  isLiveSupabase?: boolean;
}

const PRESET_ISSUES: Record<string, { category: string; label: string }[]> = {
  TECHNICAL: [
    { category: "A/C", label: "❄️ A/C Not Cooling" },
    { category: "Plumbing", label: "🚰 Leaking Sink / Shower" },
    { category: "Electrical", label: "💡 Lighting / Power Issue" },
    { category: "TV/Audio", label: "📺 TV / Remote Malfunction" },
    { category: "Lock", label: "🔑 Door Lock Stiff" },
  ],
  HOUSEKEEPING: [
    { category: "Towels", label: "🛁 Extra Towels Requested" },
    { category: "Bedding", label: "🛏️ Extra Blanket / Pillow" },
    { category: "Toiletries", label: "🧴 Shampoos & Soap Restock" },
    { category: "Cleaning", label: "🧹 Urgent Floor Clean" },
    { category: "Minibar", label: "🍫 Minibar Restock" },
  ],
  FOOD_AND_BEVERAGE: [
    { category: "Room Service", label: "🍽️ Room Service Delivery" },
    { category: "Breakfast", label: "🥐 Continental Breakfast Tray" },
    { category: "Drinks", label: "🍾 Champagne & Ice Bucket" },
  ],
  CONCIERGE: [
    { category: "Luggage", label: "🧳 Luggage Collection" },
    { category: "Transport", label: "🚕 Airport Transfer" },
  ],
  SECURITY: [
    { category: "Noise", label: "🔊 Late Night Noise" },
    { category: "Keycard", label: "💳 Keycard Reprogramming" },
  ],
};

const DEFAULT_PRESETS = [
  { category: "General", label: "📋 General Guest Request" },
  { category: "Urgent", label: "⚡ High-Priority Attention" },
];

export default function ReceptionPortal({
  rooms,
  departmentsList = [],
  reclamationsList = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"ROOMS" | "RECLAMATIONS" | "STATS">("ROOMS");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Room Pop-up Modal State
  const [selectedRoomModal, setSelectedRoomModal] = useState<HotelRoom | null>(null);
  const [modalTab, setModalTab] = useState<"RECLAMATIONS" | "ROOM_STAT">("ROOM_STAT");
  const [roomModalSubTab, setRoomModalSubTab] = useState<"ACTIVE" | "MOST_REPORTED" | "HISTORY">("ACTIVE");

  // Specific Room Reclamations for Modal
  const roomModalReclamations = useMemo(() => {
    if (!selectedRoomModal) return [];
    return reclamationsList.filter(
      (r) =>
        r.room_id === selectedRoomModal.id ||
        r.room?.room_number === selectedRoomModal.room_number
    );
  }, [reclamationsList, selectedRoomModal]);

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

  // Modal New Ticket Form State
  const [modalDept, setModalDept] = useState<string>("TECHNICAL");
  const [modalCategory, setModalCategory] = useState<string>("A/C");
  const [modalDesc, setModalDesc] = useState<string>("");
  const [modalPriority, setModalPriority] = useState<"STANDARD" | "HIGH" | "EMERGENCY">("STANDARD");
  const [modalConfidential, setModalConfidential] = useState<boolean>(false);

  // Filters for Room Grid
  const [roomSearch, setRoomSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OCCUPIED" | "VACANT" | "DIRTY">("ALL");

  // Filters for Reclamations Table
  const [recStatusFilter, setRecStatusFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [recDeptFilter, setRecDeptFilter] = useState<string>("ALL");

  // Historical Ticket Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [histRoom, setHistRoom] = useState("");
  const [histDept, setHistDept] = useState<string>("TECHNICAL");
  const [histCategory, setHistCategory] = useState("A/C");
  const [histDesc, setHistDesc] = useState("");
  const [histDate, setHistDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [histStatus, setHistStatus] = useState<"OPEN" | "IN_PROGRESS" | "RESOLVED">("RESOLVED");

  // Departments List
  const allDepartments = useMemo(() => {
    const list: { code: string; name: string; icon: string }[] = [
      { code: "TECHNICAL", name: "Technical Maintenance", icon: "🔧" },
      { code: "HOUSEKEEPING", name: "Housekeeping & Linen", icon: "🧹" },
      { code: "FOOD_AND_BEVERAGE", name: "Food & Beverage", icon: "🍽️" },
      { code: "CONCIERGE", name: "Concierge & Valet", icon: "🚗" },
      { code: "SECURITY", name: "Security & Safety", icon: "🛡️" },
      { code: "SPA_AND_WELLNESS", name: "Spa & Wellness", icon: "🧖" },
    ];
    departmentsList.forEach((d) => {
      if (!list.some((e) => e.code === d.code)) {
        list.push({ code: d.code, name: d.name, icon: d.icon || "🏢" });
      }
    });
    return list;
  }, [departmentsList]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomSearch && !r.room_number.includes(roomSearch)) return false;
      if (floorFilter !== "ALL" && r.floor !== floorFilter) return false;
      if (statusFilter === "OCCUPIED" && !r.is_occupied) return false;
      if (statusFilter === "VACANT" && r.is_occupied) return false;
      if (statusFilter === "DIRTY" && r.cleaning_status !== "DIRTY") return false;
      return true;
    });
  }, [rooms, roomSearch, floorFilter, statusFilter]);

  // Filtered Reclamations
  const filteredReclamations = useMemo(() => {
    return reclamationsList.filter((rec) => {
      if (recStatusFilter !== "ALL" && rec.status !== recStatusFilter) return false;
      if (recDeptFilter !== "ALL" && rec.department !== recDeptFilter) return false;
      return true;
    });
  }, [reclamationsList, recStatusFilter, recDeptFilter]);



  // Stay State Handler
  const handleStayState = (roomId: number, state: "OCCUPIED" | "VACANT_DIRTY" | "RESERVED") => {
    startTransition(async () => {
      const res = await updateRoomStayState(roomId, state);
      if (res.success) {
        setMessage(`✅ Room state updated!`);
        if (selectedRoomModal) {
          setSelectedRoomModal((prev) =>
            prev ? { ...prev, is_occupied: state === "OCCUPIED" } : null
          );
        }
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Cleaning Cycle Handler
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

  // Create Reclamation inside Modal
  const handleModalCreateReclamation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomModal) return;

    startTransition(async () => {
      const res = await createRapidReclamation({
        roomId: selectedRoomModal.id,
        department: modalDept,
        category: modalCategory,
        description: modalDesc.trim() || `${modalCategory} issue logged via Room Modal`,
        priority: modalPriority,
        isConfidential: modalConfidential,
      });

      if (res.success) {
        setMessage(`✅ Reclamation created for Room ${selectedRoomModal.room_number}!`);
        setModalDesc("");
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  // Acknowledge Ticket
  const handleAcknowledgeTicket = (id: number) => {
    startTransition(async () => {
      const res = await acknowledgeReclamation(id);
      if (res.success) {
        setMessage(`📌 Reclamation #${id} set to IN_PROGRESS.`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Resolve Ticket
  const handleResolveTicket = (id: number) => {
    startTransition(async () => {
      const res = await resolveReclamation(id, "Resolved by Reception");
      if (res.success) {
        setMessage(`✅ Ticket #${id} marked RESOLVED.`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Submit Historical Ticket
  const handleHistoricalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.room_number === histRoom);
    if (!targetRoom) {
      alert("Invalid room number!");
      return;
    }

    startTransition(async () => {
      const res = await createHistoricalReclamation({
        roomId: targetRoom.id,
        department: histDept,
        category: histCategory,
        description: histDesc || `Historical logbook entry for ${histCategory}`,
        status: histStatus,
        createdAt: histDate,
        isConfidential: false,
      });

      if (res.success) {
        alert(`Successfully backfilled historical reclamation for Room ${targetRoom.room_number}!`);
        setShowHistoryModal(false);
        setHistDesc("");
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  // Summary Metrics
  const totalRooms = rooms.length;
  const occupiedCount = rooms.filter((r) => r.is_occupied).length;
  const dirtyCount = rooms.filter((r) => r.cleaning_status === "DIRTY").length;
  const vacantCleanCount = rooms.filter((r) => !r.is_occupied && r.cleaning_status === "CLEAN").length;
  const openReclamationsCount = reclamationsList.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;

  const deptCounts: Record<string, number> = {};
  reclamationsList.forEach((rec) => {
    deptCounts[rec.department] = (deptCounts[rec.department] || 0) + 1;
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
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: 20,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 10px 30px rgba(2, 132, 199, 0.15)",
        }}
      >
        <div>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              <span>🛎️ RECEPTION PORTAL</span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Front Desk Workspace
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Cyan Luxury Reception Theme
            </p>
          </div>

          {/* VERTICAL SIDEBAR TABS */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.5rem" }}>
            {[
              { id: "ROOMS", label: "🏨 1. Rooms Grid", count: totalRooms, color: "#38bdf8" },
              { id: "RECLAMATIONS", label: "🛎️ 2. Reclamations", count: reclamationsList.length, color: "#e879f9" },
              { id: "STATS", label: "📊 3. Stats & Graphs", count: null, color: "#fbbf24" },
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
                    background: isActive ? `rgba(56, 189, 248, 0.2)` : "rgba(30, 41, 59, 0.5)",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: isActive ? tab.color : "rgba(255, 255, 255, 0.1)",
                        color: isActive ? "#000" : "#cbd5e1",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* STACKED QUICK METRICS CARDS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Occupied Rooms</span>
              <strong style={{ fontSize: 14, color: "#fbbf24" }}>{occupiedCount} ({Math.round((occupiedCount / (totalRooms || 1)) * 100)}%)</strong>
            </div>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Vacant Clean</span>
              <strong style={{ fontSize: 14, color: "#4ade80" }}>{vacantCleanCount}</strong>
            </div>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Dirty Rooms</span>
              <strong style={{ fontSize: 14, color: dirtyCount > 0 ? "#f87171" : "#4ade80" }}>{dirtyCount}</strong>
            </div>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Open Reclamations</span>
              <strong style={{ fontSize: 14, color: openReclamationsCount > 0 ? "#e879f9" : "#4ade80" }}>{openReclamationsCount}</strong>
            </div>
          </div>
        </div>

        {/* SIDEBAR FOOTER & LOG OUT */}
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              width: "100%",
              padding: "9px",
              borderRadius: 10,
              border: "1px solid rgba(251, 191, 36, 0.4)",
              background: "rgba(251, 191, 36, 0.15)",
              color: "#fbbf24",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📜 Backfill Past Ticket
          </button>

          <button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await logoutRole();
                window.location.href = "/login";
              });
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 10,
              border: "1px solid rgba(239, 68, 68, 0.4)",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
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
          <div style={{ marginBottom: "1rem", padding: "10px 14px", borderRadius: 10, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 14, fontWeight: 600 }}>
            {message}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: ROOMS GRID */}
        {/* ========================================================================= */}
        {activeTab === "ROOMS" && (
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
                  🏨 Hotel Rooms Map ({filteredRooms.length} rooms)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  💡 Click any room card to open the <strong>Interactive Room Pop-Up Modal</strong> with Reclamations & Room Stats!
                </p>
              </div>

              {/* Room Grid Filters */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Search room #..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                />

                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                >
                  <option value="ALL">All Floors</option>
                  <option value={1}>Floor 1</option>
                  <option value={2}>Floor 2</option>
                  <option value={3}>Floor 3</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OCCUPIED">Occupied Only</option>
                  <option value="VACANT">Vacant Only</option>
                  <option value="DIRTY">Dirty Only</option>
                </select>
              </div>
            </div>

            {/* Room Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, maxHeight: 620, overflowY: "auto", paddingRight: 4 }}>
              {filteredRooms.map((room) => {
                const isDirty = room.cleaning_status === "DIRTY";
                const isClean = room.cleaning_status === "CLEAN";
                const roomTicketCount = reclamationsList.filter((r) => r.room_id === room.id || r.room?.room_number === room.room_number).length;

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomModal(room);
                      setModalTab("ROOM_STAT");
                    }}
                    style={{
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1.5px solid",
                      borderColor: isDirty ? "rgba(239, 68, 68, 0.4)" : isClean ? "rgba(34, 197, 94, 0.3)" : "rgba(56, 189, 248, 0.3)",
                      borderRadius: 12,
                      padding: "12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      transition: "transform 0.15s ease, border-color 0.15s ease",
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
                      <span style={{ fontSize: 10, color: isDirty ? "#f87171" : isClean ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>
                        {isDirty ? "🧹 DIRTY" : isClean ? "✨ CLEAN" : `🧼 ${room.cleaning_status}`}
                      </span>
                      {roomTicketCount > 0 && (
                        <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(232, 121, 249, 0.2)", color: "#e879f9", fontWeight: 800 }}>
                          🛎️ {roomTicketCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RECLAMATIONS */}
        {/* ========================================================================= */}
        {activeTab === "RECLAMATIONS" && (
          <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#e879f9" }}>
                🛎️ Reclamations Tracker & Dispatch ({filteredReclamations.length} tickets)
              </h3>

              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={recStatusFilter}
                  onChange={(e) => setRecStatusFilter(e.target.value as any)}
                  style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open Only</option>
                  <option value="IN_PROGRESS">In Progress Only</option>
                  <option value="RESOLVED">Resolved Only</option>
                </select>

                <select
                  value={recDeptFilter}
                  onChange={(e) => setRecDeptFilter(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                >
                  <option value="ALL">All Departments</option>
                  {allDepartments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                  ))}
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
                    <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReclamations.map((rec) => {
                    const roomNum = rec.room?.room_number || `Room ${rec.room_id}`;
                    const isResolved = rec.status === "RESOLVED";
                    const isOpen = rec.status === "OPEN";

                    return (
                      <tr key={rec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "#38bdf8" }}>#{rec.id} • {roomNum}</td>
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
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          {!isResolved && (
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {isOpen && (
                                <button disabled={isPending} onClick={() => handleAcknowledgeTicket(rec.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "#3b82f6", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  In Progress
                                </button>
                              )}
                              <button disabled={isPending} onClick={() => handleResolveTicket(rec.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "#10b981", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                Resolve
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STATS & GRAPHS */}
        {/* ========================================================================= */}
        {activeTab === "STATS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#38bdf8" }}>
                📊 Room State Distribution Graph
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <svg width="120" height="120" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.8" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3.8"
                    strokeDasharray={`${Math.round((occupiedCount / (totalRooms || 1)) * 100)}, 100`}
                  />
                  <text x="18" y="20.35" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">
                    {Math.round((occupiedCount / (totalRooms || 1)) * 100)}%
                  </text>
                </svg>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fbbf24", fontWeight: 700 }}>Occupied:</span>
                    <strong style={{ color: "#fff" }}>{occupiedCount}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>Vacant Clean:</span>
                    <strong style={{ color: "#fff" }}>{vacantCleanCount}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#f87171", fontWeight: 700 }}>Dirty Rooms:</span>
                    <strong style={{ color: "#fff" }}>{dirtyCount}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#e879f9" }}>
                🏢 Department Ticket Demand Graph
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
                        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #a855f7, #e879f9)", borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* INTERACTIVE ROOM POP-UP MODAL (WITH INTERNAL SIDEBAR: RECLAMATION & ROOM STAT) */}
      {/* ========================================================================= */}
      {selectedRoomModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1.5px solid rgba(56, 189, 248, 0.4)", borderRadius: 20, maxWidth: 840, width: "100%", height: 560, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            {/* Modal Top Bar */}
            <div style={{ background: "rgba(30, 41, 59, 0.9)", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🏨</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#ffffff" }}>
                    Room {selectedRoomModal.room_number} Inspection & Operations
                  </h3>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Floor {selectedRoomModal.floor} • {selectedRoomModal.block?.replace("_", " ") || "Main Block"}
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedRoomModal(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* Modal Body: Internal Sidebar + Main Content */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* MODAL INTERNAL SIDEBAR */}
              <div style={{ width: 210, background: "rgba(15, 23, 42, 0.9)", borderRight: "1px solid rgba(255,255,255,0.08)", padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>Room Modal Menu</div>

                <button
                  onClick={() => setModalTab("ROOM_STAT")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid",
                    borderColor: modalTab === "ROOM_STAT" ? "#38bdf8" : "transparent",
                    background: modalTab === "ROOM_STAT" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                    color: modalTab === "ROOM_STAT" ? "#fff" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>📊</span> 1. Room Stat
                </button>

                <button
                  onClick={() => setModalTab("RECLAMATIONS")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid",
                    borderColor: modalTab === "RECLAMATIONS" ? "#e879f9" : "transparent",
                    background: modalTab === "RECLAMATIONS" ? "rgba(232, 121, 249, 0.2)" : "transparent",
                    color: modalTab === "RECLAMATIONS" ? "#fff" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>🛎️ 2. Reclamations</span>
                  <span style={{ padding: "1px 6px", borderRadius: 999, background: "rgba(232, 121, 249, 0.3)", color: "#e879f9", fontSize: 10, fontWeight: 800 }}>
                    {roomModalReclamations.length}
                  </span>
                </button>
              </div>

              {/* MODAL MAIN TAB CONTENT */}
              <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto" }}>
                {/* MODAL TAB 1: ROOM STAT */}
                {modalTab === "ROOM_STAT" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 15, color: "#38bdf8", fontWeight: 800 }}>
                      📊 Room Status & Live Parameters
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                      <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Occupancy State</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: selectedRoomModal.is_occupied ? "#fbbf24" : "#4ade80", marginTop: 2 }}>
                          {selectedRoomModal.is_occupied ? "Occupied (Guest In-House)" : "Vacant Room"}
                        </div>
                      </div>

                      <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Cleaning Status</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: selectedRoomModal.cleaning_status === "DIRTY" ? "#f87171" : "#4ade80", marginTop: 2 }}>
                          {selectedRoomModal.cleaning_status}
                        </div>
                      </div>
                    </div>

                    {/* Stay State Quick Actions */}
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>Stay Actions:</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          disabled={isPending}
                          onClick={() => handleStayState(selectedRoomModal.id, "OCCUPIED")}
                          style={{ flex: 1, padding: "8px", borderRadius: 8, background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          🛎️ Check-In Guest
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => handleStayState(selectedRoomModal.id, "VACANT_DIRTY")}
                          style={{ flex: 1, padding: "8px", borderRadius: 8, background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          🚪 Check-Out (Dirty)
                        </button>
                      </div>
                    </div>

                    {/* Cycle Cleanliness Button */}
                    <div style={{ marginTop: 6 }}>
                      <button
                        disabled={isPending}
                        onClick={() => handleCleaningCycle(selectedRoomModal)}
                        style={{ width: "100%", padding: "10px", borderRadius: 10, background: "rgba(56, 189, 248, 0.2)", border: "1px solid #38bdf8", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                      >
                        🧹 Cycle Cleaning Status (Current: {selectedRoomModal.cleaning_status}) &rarr;
                      </button>
                    </div>
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
                          background: roomModalSubTab === "ACTIVE" ? "#38bdf8" : "transparent",
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
                          background: roomModalSubTab === "MOST_REPORTED" ? "#fbbf24" : "transparent",
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h4 style={{ margin: 0, fontSize: 14, color: "#38bdf8", fontWeight: 800 }}>
                            ⚡ Active Reclamations ({roomActiveReclamations.length})
                          </h4>
                        </div>

                        {roomActiveReclamations.length === 0 ? (
                          <div style={{ padding: "12px", borderRadius: 10, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#4ade80", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>✅</span>
                            <span>No active problems recorded for Room {selectedRoomModal.room_number}. Operations normal.</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {roomActiveReclamations.map((rec) => (
                              <div key={rec.id} style={{ background: "rgba(30, 41, 59, 0.7)", padding: "12px", borderRadius: 10, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>#{rec.id} • {rec.category}</span>
                                    <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8" }}>{rec.department}</span>
                                  </div>
                                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "OPEN" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", color: rec.status === "OPEN" ? "#f87171" : "#fbbf24", fontWeight: 800, border: "1px solid currentColor" }}>
                                    {rec.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{rec.description}</div>
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                                  <button
                                    onClick={() => handleAcknowledgeTicket(rec.id)}
                                    style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(251, 191, 36, 0.2)", border: "1px solid #fbbf24", color: "#fbbf24", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Acknowledge
                                  </button>
                                  <button
                                    onClick={() => handleResolveTicket(rec.id)}
                                    style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(34, 197, 94, 0.2)", border: "1px solid #4ade80", color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Mark Resolved ✓
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* LOG NEW RECLAMATION FORM */}
                        <form onSubmit={handleModalCreateReclamation} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>➕ Log New Reclamation for Room {selectedRoomModal.room_number}</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <select
                              value={modalDept}
                              onChange={(e) => setModalDept(e.target.value)}
                              style={{ flex: 1, padding: "6px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                            >
                              {allDepartments.map((d) => (
                                <option key={d.code} value={d.code}>{d.name}</option>
                              ))}
                            </select>
                            <select
                              value={modalPriority}
                              onChange={(e) => setModalPriority(e.target.value as any)}
                              style={{ width: 110, padding: "6px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                            >
                              <option value="STANDARD">STANDARD</option>
                              <option value="HIGH">HIGH</option>
                              <option value="EMERGENCY">EMERGENCY</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder="Description of issue..."
                            value={modalDesc}
                            onChange={(e) => setModalDesc(e.target.value)}
                            style={{ padding: "8px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12 }}
                          />
                          <button
                            type="submit"
                            disabled={isPending}
                            style={{ padding: "8px", borderRadius: 8, background: "#38bdf8", border: "none", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 12 }}
                          >
                            Dispatch Reclamation &rarr;
                          </button>
                        </form>
                      </div>
                    )}

                    {/* SUB-CATEGORY 2: MOST REPORTED PROBLEMS */}
                    {roomModalSubTab === "MOST_REPORTED" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "#fbbf24", fontWeight: 800 }}>
                          💥 Most Reported Problem Categories
                        </h4>

                        {roomProblemStats.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            No problem patterns recorded for Room {selectedRoomModal.room_number} yet.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {roomProblemStats.map((stat) => (
                              <div key={stat.category} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: 10, border: "1px solid rgba(251, 191, 36, 0.25)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>{stat.category}</span>
                                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>({stat.department})</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {stat.count >= 2 && (
                                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(239, 68, 68, 0.2)", color: "#f87171", fontWeight: 800 }}>
                                        ⚠️ Frequent Issue
                                      </span>
                                    )}
                                    <span style={{ fontWeight: 800, color: "#fbbf24", fontSize: 13 }}>{stat.count} Reports</span>
                                  </div>
                                </div>

                                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 8 }}>
                                  <div style={{ width: `${stat.percentage}%`, height: "100%", background: "linear-gradient(90deg, #d97706, #fbbf24)" }} />
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8" }}>
                                  <span>{stat.percentage}% of total issues in Room {selectedRoomModal.room_number}</span>
                                  <button
                                    onClick={() => {
                                      setModalCategory(stat.category);
                                      setModalDept(stat.department);
                                      setRoomModalSubTab("ACTIVE");
                                    }}
                                    style={{ padding: "3px 8px", borderRadius: 4, background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.4)", color: "#fbbf24", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    ➕ Log {stat.category} Ticket
                                  </button>
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
                                    #{rec.id} • {rec.category} <span style={{ color: "#e879f9", fontWeight: 600 }}>({rec.department})</span>
                                  </div>
                                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>{rec.description}</div>
                                  {rec.created_at && (
                                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Logged: {rec.created_at}</div>
                                  )}
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

      {/* HISTORICAL RECLAMATION MODAL */}
      {showHistoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 500, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#fbbf24" }}>📜 Add Historical Reclamation</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleHistoricalSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="text" required placeholder="Room Number (e.g. 1001)" value={histRoom} onChange={(e) => setHistRoom(e.target.value)} style={{ padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
              <textarea rows={3} required placeholder="Description..." value={histDesc} onChange={(e) => setHistDesc(e.target.value)} style={{ padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
              <button type="submit" disabled={isPending} style={{ padding: "8px 16px", borderRadius: 8, background: "#f59e0b", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}>Save Historical Entry</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
