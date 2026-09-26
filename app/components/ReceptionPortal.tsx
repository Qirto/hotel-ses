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
} from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  residents?: Resident[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  staffList?: Staff[];
}

const PRESET_ISSUES: Record<string, { category: string; label: string }[]> = {
  TECHNICAL: [
    { category: "A/C", label: "❄️ A/C Not Cooling" },
    { category: "Plumbing", label: "🚰 Leaking Sink / Shower" },
    { category: "Electrical", label: "💡 Lighting / Power Issue" },
    { category: "TV/Audio", label: "📺 TV / Remote Malfunction" },
    { category: "Lock", label: "🔑 Door Lock Stiff" },
  ],
  MAINTENANCE: [
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
  GOVERNANCE: [
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
    { category: "Cutlery", label: "🍴 Extra Plates & Cutlery" },
    { category: "Dietary", label: "🥗 Special Dietary Meal" },
  ],
  CONCIERGE: [
    { category: "Luggage", label: "🧳 Luggage Collection / Delivery" },
    { category: "Transport", label: "🚕 Airport Transfer / Taxi" },
    { category: "Valet", label: "🚗 Valet Parking Vehicle Request" },
    { category: "Wakeup", label: "⏰ Morning Wake-Up Call" },
    { category: "Excursion", label: "🗺️ City Tour / Dinner Booking" },
  ],
  SECURITY: [
    { category: "Noise", label: "🔊 Late Night Noise Disturbance" },
    { category: "Keycard", label: "💳 Keycard Reprogramming" },
    { category: "Safe", label: "🔐 In-Room Electronic Safe Reset" },
    { category: "Safety", label: "🛡️ Suspicious Activity Check" },
  ],
  SPA_AND_WELLNESS: [
    { category: "Massage", label: "💆 In-Room Relaxation Massage" },
    { category: "Spa Booking", label: "🧖 Thermal Spa Appointment" },
    { category: "Fitness", label: "🏋️ Personal Trainer Session" },
    { category: "Wellness", label: "🌿 Aromatherapy Kit Request" },
  ],
};

const DEFAULT_PRESETS = [
  { category: "General", label: "📋 General Guest Request" },
  { category: "Follow-up", label: "📞 Department Assistance Needed" },
  { category: "Urgent", label: "⚡ High-Priority Attention" },
];

export default function ReceptionPortal({
  rooms,
  departmentsList = [],
  reclamationsList = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"ROOMS" | "RECLAMATIONS">("ROOMS");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("TECHNICAL");
  const [isConfidential, setIsConfidential] = useState(false);
  const [priority, setPriority] = useState<"STANDARD" | "HIGH" | "EMERGENCY">("STANDARD");
  const [customDesc, setCustomDesc] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters for Room Grid
  const [roomSearch, setRoomSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OCCUPIED" | "VACANT" | "DIRTY">("ALL");

  // Filters for Reclamations Table
  const [recStatusFilter, setRecStatusFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [recDeptFilter, setRecDeptFilter] = useState<string>("ALL");
  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});

  // Historical Ticket Backfill Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [histRoom, setHistRoom] = useState("");
  const [histDept, setHistDept] = useState<string>("TECHNICAL");
  const [histCategory, setHistCategory] = useState("A/C");
  const [histDesc, setHistDesc] = useState("");
  const [histDate, setHistDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [histStatus, setHistStatus] = useState<"RESOLVED" | "OPEN">("RESOLVED");

  // Merge departments
  const allDepartments = useMemo(() => {
    const list: { code: string; name: string; icon: string }[] = [
      { code: "TECHNICAL", name: "Technical Maintenance", icon: "🔧" },
      { code: "HOUSEKEEPING", name: "Housekeeping & Linen", icon: "🧹" },
      { code: "FOOD_AND_BEVERAGE", name: "Food & Beverage (F&B)", icon: "🍽️" },
      { code: "CONCIERGE", name: "Concierge & Valet", icon: "🚗" },
      { code: "SECURITY", name: "Security & Safety", icon: "🛡️" },
      { code: "SPA_AND_WELLNESS", name: "Spa & Wellness", icon: "🧖" },
      { code: "MANAGEMENT", name: "Executive & Direction", icon: "👔" },
    ];

    departmentsList.forEach((d) => {
      if (!list.some((existing) => existing.code === d.code)) {
        list.push({ code: d.code, name: d.name, icon: d.icon || "🏢" });
      }
    });

    return list;
  }, [departmentsList]);

  const activeRoom = rooms.find((r) => r.room_number === selectedRoomNumber);
  const presetsToDisplay = PRESET_ISSUES[selectedDept] || DEFAULT_PRESETS;

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

  // Submit Rapid Reclamation
  const handleRapidSubmit = (preset: { category: string; label: string }) => {
    if (!activeRoom) {
      setMessage("⚠️ Please select a room first!");
      return;
    }

    startTransition(async () => {
      const res = await createRapidReclamation({
        roomId: activeRoom.id,
        department: selectedDept,
        category: preset.category,
        description: customDesc.trim() || preset.label,
        priority,
        isConfidential,
      });

      if (res.success) {
        setMessage(`✅ Dispatched "${preset.label}" to ${selectedDept} for Room ${activeRoom.room_number}!`);
        setCustomDesc("");
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage(`❌ Failed: ${res.error}`);
      }
    });
  };

  // Submit Stay State Update
  const handleStayState = (state: "OCCUPIED" | "VACANT_DIRTY" | "RESERVED") => {
    if (!activeRoom) {
      setMessage("⚠️ Please select a room first!");
      return;
    }

    startTransition(async () => {
      const res = await updateRoomStayState(activeRoom.id, state);
      if (res.success) {
        setMessage(`✅ Room ${activeRoom.room_number} state updated to ${state}!`);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`❌ Failed to update room stay state: ${res.error}`);
      }
    });
  };

  // Toggle Room Cleaning Cycle
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
        setMessage(`🧹 Room ${room.room_number} cleaning set to ${nextStatus}!`);
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
        isConfidential,
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

  // Reclamation Action Handlers
  const handleAcknowledgeTicket = (id: number) => {
    startTransition(async () => {
      const res = await acknowledgeReclamation(id);
      if (res.success) {
        setMessage(`📌 Reclamation #${id} set to IN_PROGRESS.`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleResolveTicket = (id: number) => {
    const notes = resolutionNotes[id] || "Resolved by Reception Desk.";
    startTransition(async () => {
      const res = await resolveReclamation(id, notes);
      if (res.success) {
        setMessage(`✅ Reclamation #${id} marked as RESOLVED.`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Summary Metrics
  const totalRooms = rooms.length;
  const occupiedCount = rooms.filter((r) => r.is_occupied).length;
  const dirtyCount = rooms.filter((r) => r.cleaning_status === "DIRTY").length;
  const vacantCleanCount = rooms.filter((r) => !r.is_occupied && r.cleaning_status === "CLEAN").length;
  const openReclamationsCount = reclamationsList.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Dashboard Navigation */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.25rem 1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span>🛎️ RECEPTION DESK DASHBOARD</span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Room Management & Reclamations Dispatch
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Complete reception workflow: manage room stay states, floor cleanliness, guest check-ins, and ticket dispatches.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowHistoryModal(true)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(251, 191, 36, 0.4)",
                background: "rgba(251, 191, 36, 0.15)",
                color: "#fbbf24",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>📜</span> Backfill Past Ticket
            </button>
          </div>
        </div>

        {/* Dashboard Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Total Rooms</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{totalRooms}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Occupied Rooms</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>{occupiedCount} ({Math.round((occupiedCount / (totalRooms || 1)) * 100)}%)</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Vacant Clean</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>{vacantCleanCount}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Dirty Rooms</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: dirtyCount > 0 ? "#f87171" : "#4ade80" }}>{dirtyCount}</div>
          </div>
          <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Open Reclamations</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: openReclamationsCount > 0 ? "#e879f9" : "#4ade80" }}>{openReclamationsCount}</div>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div style={{ display: "flex", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
          <button
            onClick={() => setActiveTab("ROOMS")}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "ROOMS" ? "#38bdf8" : "rgba(255,255,255,0.08)",
              background: activeTab === "ROOMS" ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "ROOMS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🏨</span> 1. Manage Rooms & Stay States
          </button>
          <button
            onClick={() => setActiveTab("RECLAMATIONS")}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "RECLAMATIONS" ? "#e879f9" : "rgba(255,255,255,0.08)",
              background: activeTab === "RECLAMATIONS" ? "rgba(232, 121, 249, 0.2)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "RECLAMATIONS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🛎️</span> 2. Manage Reclamations ({reclamationsList.length})
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ROOMS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "ROOMS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* 3-TAP RAPID DISPATCH & ROOM CONTROL TOOLBAR */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
            {/* TAP 1: ROOM SELECTION */}
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                <span>1️⃣ Tap 1: Select Active Room</span>
                {activeRoom && (
                  <span style={{ color: "#4ade80", fontWeight: 800 }}>Room {activeRoom.room_number}</span>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Search room (e.g. 1001, 204)..."
                  value={selectedRoomNumber}
                  onChange={(e) => setSelectedRoomNumber(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f8fafc",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Quick Room Picker Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                {rooms
                  .filter((r) => !selectedRoomNumber || r.room_number.includes(selectedRoomNumber))
                  .slice(0, 24)
                  .map((r) => {
                    const isSelected = selectedRoomNumber === r.room_number;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRoomNumber(r.room_number)}
                        style={{
                          padding: "6px 4px",
                          borderRadius: 6,
                          border: "1px solid",
                          borderColor: isSelected ? "#38bdf8" : "rgba(255,255,255,0.08)",
                          background: isSelected ? "rgba(56, 189, 248, 0.3)" : r.is_occupied ? "rgba(245, 158, 11, 0.2)" : "rgba(15, 23, 42, 0.6)",
                          color: isSelected ? "#ffffff" : r.is_occupied ? "#fbbf24" : "#cbd5e1",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        {r.room_number}
                      </button>
                    );
                  })}
              </div>

              {/* Stay State Quick Actions */}
              {activeRoom && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                    Stay State: {activeRoom.is_occupied ? "Occupied" : "Vacant"} ({activeRoom.cleaning_status})
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      disabled={isPending}
                      onClick={() => handleStayState("OCCUPIED")}
                      style={{ flex: 1, padding: "6px 8px", borderRadius: 6, background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      🛎️ Check-In
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleStayState("VACANT_DIRTY")}
                      style={{ flex: 1, padding: "6px 8px", borderRadius: 6, background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      🚪 Check-Out (Dirty)
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleStayState("RESERVED")}
                      style={{ flex: 1, padding: "6px 8px", borderRadius: 6, background: "rgba(148, 163, 184, 0.2)", border: "1px solid rgba(148, 163, 184, 0.4)", color: "#cbd5e1", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      📅 Reserved
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TAP 2: TARGET DEPARTMENT */}
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#a855f7", marginBottom: 12 }}>
                2️⃣ Tap 2: Target Department & Priority
              </div>

              {/* Quick Department Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 12 }}>
                {[
                  { code: "TECHNICAL", label: "🔧 Technical (Fix)" },
                  { code: "HOUSEKEEPING", label: "🧹 Housekeeping" },
                  { code: "FOOD_AND_BEVERAGE", label: "🍽️ F&B Dining" },
                  { code: "CONCIERGE", label: "🚗 Concierge" },
                  { code: "SECURITY", label: "🛡️ Security" },
                  { code: "SPA_AND_WELLNESS", label: "🧖 Spa & Gym" },
                ].map((d) => (
                  <button
                    key={d.code}
                    onClick={() => setSelectedDept(d.code)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor: selectedDept === d.code ? "#a855f7" : "rgba(255,255,255,0.08)",
                      background: selectedDept === d.code ? "rgba(168, 85, 247, 0.25)" : "rgba(15, 23, 42, 0.6)",
                      color: selectedDept === d.code ? "#e879f9" : "#cbd5e1",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Priority</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["STANDARD", "HIGH", "EMERGENCY"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: priority === p ? (p === "EMERGENCY" ? "#ef4444" : p === "HIGH" ? "#f59e0b" : "#3b82f6") : "rgba(15, 23, 42, 0.6)",
                        color: priority === p ? "#fff" : "#94a3b8",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(15, 23, 42, 0.8)", display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="confCheck"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="confCheck" style={{ fontSize: 12, color: isConfidential ? "#f87171" : "#cbd5e1", cursor: "pointer", fontWeight: 600 }}>
                  🔒 Confidential Grievance (GM Only)
                </label>
              </div>
            </div>

            {/* TAP 3: INSTANT DISPATCH */}
            <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", marginBottom: 12 }}>
                3️⃣ Tap 3: Instant Ticket Dispatch
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {presetsToDisplay.map((preset) => (
                  <button
                    key={preset.category}
                    disabled={isPending || !activeRoom}
                    onClick={() => handleRapidSubmit(preset)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: activeRoom ? "rgba(15, 23, 42, 0.8)" : "rgba(15, 23, 42, 0.3)",
                      color: activeRoom ? "#f8fafc" : "#64748b",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: activeRoom ? "pointer" : "not-allowed",
                      transition: "all 0.15s ease",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{preset.label}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>&rarr; Dispatch</span>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Or custom complaint note..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f8fafc",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          {/* FULL ROOM MATRIX & DETAILED LIST */}
          <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#38bdf8" }}>
                🏨 Full Hotel Rooms Directory ({filteredRooms.length} rooms)
              </h3>

              {/* Room Grid Filters */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
              {filteredRooms.map((room) => {
                const isDirty = room.cleaning_status === "DIRTY";
                const isClean = room.cleaning_status === "CLEAN";
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomNumber(room.room_number)}
                    style={{
                      background: selectedRoomNumber === room.room_number ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.6)",
                      border: "1px solid",
                      borderColor: selectedRoomNumber === room.room_number ? "#38bdf8" : isDirty ? "rgba(239, 68, 68, 0.3)" : "rgba(255,255,255,0.06)",
                      borderRadius: 10,
                      padding: "10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
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
                      <span style={{ fontSize: 10, color: isDirty ? "#f87171" : isClean ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>
                        {isDirty ? "🧹 DIRTY" : isClean ? "✨ CLEAN" : `🧼 ${room.cleaning_status}`}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCleaningCycle(room);
                        }}
                        title="Cycle Cleanliness Status"
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.1)",
                          border: "none",
                          color: "#cbd5e1",
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        Cycle Status &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECLAMATIONS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "RECLAMATIONS" && (
        <div style={{ background: "rgba(15, 23, 42, 0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#e879f9" }}>
                🛎️ Reclamations Management & Dispatch Tracker
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Track live guest requests, acknowledge pending issues, and mark resolved tickets.
              </p>
            </div>

            {/* Reclamation Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                  <option key={d.code} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reclamations Table */}
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
                  <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReclamations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      No reclamations found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredReclamations.map((rec) => {
                    const roomNum = rec.room?.room_number || `Room ${rec.room_id}`;
                    const isResolved = rec.status === "RESOLVED";
                    const isInProgress = rec.status === "IN_PROGRESS";
                    const isOpen = rec.status === "OPEN";

                    return (
                      <tr key={rec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: rec.is_confidential ? "rgba(239, 68, 68, 0.08)" : "transparent" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "#38bdf8" }}>
                          #{rec.id} • {roomNum}
                          {rec.is_confidential && <span style={{ marginLeft: 4, fontSize: 10, color: "#f87171" }}>🔒</span>}
                        </td>
                        <td style={{ padding: "10px", color: "#cbd5e1", fontWeight: 600 }}>
                          {rec.department}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: 700, color: "#f8fafc" }}>{rec.category}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{rec.description}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                            background: rec.priority === "EMERGENCY" ? "#ef4444" : rec.priority === "HIGH" ? "#f59e0b" : "rgba(59, 130, 246, 0.3)",
                            color: "#fff",
                          }}>
                            {rec.priority || "STANDARD"}
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            background: isResolved ? "rgba(34, 197, 94, 0.2)" : isInProgress ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: isResolved ? "#4ade80" : isInProgress ? "#fbbf24" : "#f87171",
                          }}>
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", color: "#94a3b8", fontSize: 12 }}>
                          {rec.assigned_to ? rec.assigned_to.full_name : "— Unassigned —"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          {!isResolved && (
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                              {isOpen && (
                                <button
                                  disabled={isPending}
                                  onClick={() => handleAcknowledgeTicket(rec.id)}
                                  style={{ padding: "4px 8px", borderRadius: 6, background: "#3b82f6", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                >
                                  In Progress
                                </button>
                              )}
                              <button
                                disabled={isPending}
                                onClick={() => handleResolveTicket(rec.id)}
                                style={{ padding: "4px 8px", borderRadius: 6, background: "#10b981", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                              >
                                Resolve
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORICAL RECLAMATION MODAL */}
      {showHistoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 500, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#fbbf24" }}>📜 Add Historical / Past Reclamation</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleHistoricalSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Room Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1001, 2071"
                  value={histRoom}
                  onChange={(e) => setHistRoom(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Department</label>
                  <select
                    value={histDept}
                    onChange={(e) => setHistDept(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    {allDepartments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Past Date</label>
                  <input
                    type="date"
                    required
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A/C, Plumbing, Room Service, Towels, Noise"
                  value={histCategory}
                  onChange={(e) => setHistCategory(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Description / Paper Logbook Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Details transcribed from paper logbook..."
                  value={histDesc}
                  onChange={(e) => setHistDesc(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Status in Archive</label>
                <select
                  value={histStatus}
                  onChange={(e) => setHistStatus(e.target.value as "RESOLVED" | "OPEN")}
                  style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                >
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="OPEN">OPEN / PENDING</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "#f59e0b", border: "none", color: "#000", fontWeight: 700, cursor: "pointer" }}
                >
                  Save Historical Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
