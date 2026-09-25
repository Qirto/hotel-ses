"use client";

import React, { useState, useTransition, useMemo } from "react";
import { HotelRoom, Resident, Department } from "@/utils/roomsData";
import {
  createRapidReclamation,
  createHistoricalReclamation,
  updateRoomStayState,
} from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  residents?: Resident[];
  departmentsList?: Department[];
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

export default function ReceptionPortal({ rooms, departmentsList = [] }: Props) {
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("TECHNICAL");
  const [isConfidential, setIsConfidential] = useState(false);
  const [priority, setPriority] = useState<"STANDARD" | "HIGH" | "EMERGENCY">("STANDARD");
  const [customDesc, setCustomDesc] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const handleRapidSubmit = (preset: { category: string; label: string }) => {
    if (!activeRoom) {
      setMessage("⚠️ Please tap a room first!");
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

  const handleStayState = (state: "OCCUPIED" | "VACANT_DIRTY" | "RESERVED") => {
    if (!activeRoom) {
      setMessage("⚠️ Please tap a room first!");
      return;
    }

    startTransition(async () => {
      const res = await updateRoomStayState(activeRoom.id, state);
      if (res.success) {
        setMessage(`✅ Room ${activeRoom.room_number} set to ${state}!`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: "rgba(15, 23, 42, 0.7)", padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#38bdf8" }}>
            🛎️ Reception Rapid Dispatch & Stay Management
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
            3-Tap touch interface: Room &rarr; Department &rarr; Preset Issue. Dispatches to all operating departments.
          </p>
        </div>

        {/* HISTORICAL LOGBOOK BACKFILL BUTTON */}
        <button
          onClick={() => setShowHistoryModal(true)}
          style={{
            padding: "8px 16px",
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
          <span>📜</span> Backfill Historical Reclamation
        </button>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* 3-TAP OPERATIONAL WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
        {/* TAP 1: ROOM SELECTION */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
            <span>1️⃣ Tap 1: Select Room</span>
            {activeRoom && (
              <span style={{ color: "#4ade80" }}>Room {activeRoom.room_number}</span>
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

          {/* Quick Room Grid (Sample first 24 rooms) */}
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

        {/* TAP 2: DEPARTMENT & CONFIDENTIALITY */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#a855f7", marginBottom: 12 }}>
            2️⃣ Tap 2: Target Hotel Department
          </div>

          {/* Department Routing Rule Indicator */}
          { (selectedDept === "TECHNICAL" || selectedDept === "MAINTENANCE") ? (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
              🔧 <strong>Room Repair Ticket:</strong> Action &rarr; Maintenance (To Fix) | 🔔 Notified &rarr; Housekeeper Manager & GM
            </div>
          ) : (selectedDept === "HOUSEKEEPING" || selectedDept === "GOVERNANCE") ? (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#e879f9", fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
              🧹 <strong>Missing / Unclean Room:</strong> Action &rarr; Housekeeper Manager & GM | 🚫 <strong>Not</strong> Sent to Maintenance
            </div>
          ) : (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(148, 163, 184, 0.15)", border: "1px solid rgba(148, 163, 184, 0.3)", color: "#cbd5e1", fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
              🏢 <strong>Department Dispatch:</strong> Action &rarr; {selectedDept} | 🔔 Notified &rarr; GM Manager
            </div>
          )}

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

          {/* All Departments Dropdown Selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Or All Hotel Departments:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#f8fafc",
                fontSize: 12,
              }}
            >
              {allDepartments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.icon} {d.name} ({d.code})
                </option>
              ))}
            </select>
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
              🔒 Confidential Grievance (Visible ONLY to Reception & GM)
            </label>
          </div>
        </div>

        {/* TAP 3: PRESET ISSUE (ONE TAP DISPATCH) */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", marginBottom: 12 }}>
            3️⃣ Tap 3: Instant Dispatch
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {presetsToDisplay.map((preset) => (
              <button
                key={preset.category}
                disabled={isPending || !activeRoom}
                onClick={() => handleRapidSubmit(preset)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: activeRoom ? "rgba(15, 23, 42, 0.8)" : "rgba(15, 23, 42, 0.3)",
                  color: activeRoom ? "#f8fafc" : "#64748b",
                  textAlign: "left",
                  fontSize: 13,
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

          <div style={{ marginTop: 12 }}>
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
                        {d.icon} {d.name} ({d.code})
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
