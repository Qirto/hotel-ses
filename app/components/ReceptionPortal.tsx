"use client";

import React, { useState, useTransition } from "react";
import { HotelRoom, Resident } from "@/utils/roomsData";
import {
  createRapidReclamation,
  createHistoricalReclamation,
  updateRoomStayState,
} from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  residents: Resident[];
}

const PRESET_ISSUES = {
  MAINTENANCE: [
    { category: "A/C", label: "❄️ A/C Not Cooling" },
    { category: "Plumbing", label: "🚰 Leaking Sink / Shower" },
    { category: "Electrical", label: "💡 Lighting / Power Issue" },
    { category: "TV/Audio", label: "📺 TV / Remote Malfunction" },
    { category: "Lock", label: "🔑 Door Lock Stiff" },
  ],
  GOVERNANCE: [
    { category: "Towels", label: "🛁 Extra Towels Requested" },
    { category: "Bedding", label: "🛏️ Extra Blanket / Pillow" },
    { category: "Toiletries", label: "🧴 Shampoos & Soap" },
    { category: "Cleaning", label: "🧹 Urgent Floor Clean" },
    { category: "Minibar", label: "🍫 Minibar Restock" },
  ],
};

export default function ReceptionPortal({ rooms }: Props) {
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<"MAINTENANCE" | "GOVERNANCE">("MAINTENANCE");
  const [isConfidential, setIsConfidential] = useState(false);
  const [priority, setPriority] = useState<"STANDARD" | "HIGH" | "EMERGENCY">("STANDARD");
  const [customDesc, setCustomDesc] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Historical Ticket Backfill Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [histRoom, setHistRoom] = useState("");
  const [histDept, setHistDept] = useState<"MAINTENANCE" | "GOVERNANCE">("MAINTENANCE");
  const [histCategory, setHistCategory] = useState("A/C");
  const [histDesc, setHistDesc] = useState("");
  const [histDate, setHistDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [histStatus, setHistStatus] = useState<"RESOLVED" | "OPEN">("RESOLVED");

  const activeRoom = rooms.find((r) => r.room_number === selectedRoomNumber);

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
        setMessage(`✅ Dispatched "${preset.label}" for Room ${activeRoom.room_number}!`);
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
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner / Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: "rgba(15, 23, 42, 0.7)", padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#38bdf8" }}>
            🛎️ Front Desk Dispatcher
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
            3-Tap guest call dispatcher, check-in / check-out stays, and historical paper archive entry.
          </p>
        </div>

        <button
          onClick={() => setShowHistoryModal(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid rgba(245, 158, 11, 0.4)",
            background: "rgba(245, 158, 11, 0.15)",
            color: "#fbbf24",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📜 + Add Old / Historical Reclamation
        </button>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* 3-TAP DISPATCHER CONTAINER */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* TAP 1: ROOM SELECTION */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>
              1️⃣ Tap 1: Select Room
            </span>
            {activeRoom && (
              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: activeRoom.is_occupied ? "#f59e0b" : "#22c55e", color: "#000", fontWeight: 700 }}>
                #{activeRoom.room_number} ({activeRoom.is_occupied ? "Occupied" : "Vacant"})
              </span>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Type room # (e.g. 1001, 2071)..."
              value={selectedRoomNumber}
              onChange={(e) => setSelectedRoomNumber(e.target.value.trim())}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f8fafc",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Quick Room Selector Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 150, overflowY: "auto", paddingRight: 4 }}>
            {rooms.slice(0, 30).map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoomNumber(r.room_number)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: selectedRoomNumber === r.room_number ? "#38bdf8" : "rgba(255,255,255,0.1)",
                  background: selectedRoomNumber === r.room_number ? "#0284c7" : "rgba(15, 23, 42, 0.6)",
                  color: "#f8fafc",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {r.room_number}
              </button>
            ))}
          </div>

          {/* Stay State Quick Toggles */}
          {activeRoom && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
                Update Room Stay State:
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
            2️⃣ Tap 2: Department & Routing
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => setSelectedDept("MAINTENANCE")}
              style={{
                flex: 1,
                padding: "12px 10px",
                borderRadius: 10,
                border: "1px solid",
                borderColor: selectedDept === "MAINTENANCE" ? "#38bdf8" : "rgba(255,255,255,0.1)",
                background: selectedDept === "MAINTENANCE" ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: selectedDept === "MAINTENANCE" ? "#38bdf8" : "#94a3b8",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              🔧 Technical Maintenance
            </button>
            <button
              onClick={() => setSelectedDept("GOVERNANCE")}
              style={{
                flex: 1,
                padding: "12px 10px",
                borderRadius: 10,
                border: "1px solid",
                borderColor: selectedDept === "GOVERNANCE" ? "#a855f7" : "rgba(255,255,255,0.1)",
                background: selectedDept === "GOVERNANCE" ? "rgba(168, 85, 247, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: selectedDept === "GOVERNANCE" ? "#c084fc" : "#94a3b8",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              🧹 Housekeeping / Gouvernante
            </button>
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
            {PRESET_ISSUES[selectedDept].map((preset) => (
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
                    onChange={(e) => setHistDept(e.target.value as "MAINTENANCE" | "GOVERNANCE")}
                    style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  >
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="GOVERNANCE">GOVERNANCE</option>
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
                  placeholder="e.g. A/C, Plumbing, Towels, Noise"
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
