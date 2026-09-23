"use client";

import React, { useState, useTransition } from "react";
import { HotelRoom } from "@/utils/roomsData";
import { cycleRoomCleaning, updateRoomHeadcount, createRapidReclamation } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
}

export default function GouvernantePortal({ rooms }: Props) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterFloor, setFilterFloor] = useState<number | "ALL">("ALL");
  const [inspectingRoom, setInspectingRoom] = useState<HotelRoom | null>(null);
  const [checklist, setChecklist] = useState({
    bedding: true,
    bathroom: true,
    minibar: true,
    electronics: true,
  });
  const [brokenItemNote, setBrokenItemNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus !== "ALL" && r.cleaning_status !== filterStatus) return false;
    if (filterFloor !== "ALL" && r.floor !== filterFloor) return false;
    return true;
  });

  const getNextStatus = (current: string): "DIRTY" | "CLEANING" | "INSPECTING" | "CLEAN" => {
    if (current === "DIRTY") return "CLEANING";
    if (current === "CLEANING") return "INSPECTING";
    if (current === "INSPECTING") return "CLEAN";
    return "DIRTY";
  };

  const handleCycleStatus = (room: HotelRoom) => {
    const next = getNextStatus(room.cleaning_status);
    startTransition(async () => {
      await cycleRoomCleaning(room.id, next);
    });
  };

  const handleHeadcountChange = (room: HotelRoom, deltaAdult: number, deltaChild: number) => {
    const newAdults = Math.max(0, (room.adult_count || 0) + deltaAdult);
    const newChildren = Math.max(0, (room.child_count || 0) + deltaChild);
    startTransition(async () => {
      await updateRoomHeadcount(room.id, newAdults, newChildren);
    });
  };

  const handleEscalateMaintenance = (roomId: number) => {
    if (!brokenItemNote.trim()) {
      alert("Please specify the broken item found!");
      return;
    }
    startTransition(async () => {
      await createRapidReclamation({
        roomId,
        department: "MAINTENANCE",
        category: "General",
        description: `[Housekeeping Inspection Fault]: ${brokenItemNote}`,
        priority: "HIGH",
      });
      alert("Maintenance ticket successfully dispatched for this room!");
      setBrokenItemNote("");
      setInspectingRoom(null);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#a855f7" }}>
          🧹 Housekeeping & Gouvernante Hub
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Manage room cleaning workflows (Dirty &rarr; Cleaning &rarr; Inspecting &rarr; Clean), guest audits, and digital room checklists.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, background: "rgba(15, 23, 42, 0.8)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
          {["ALL", "DIRTY", "CLEANING", "INSPECTING", "CLEAN"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: filterStatus === st ? "#a855f7" : "transparent",
                color: filterStatus === st ? "#fff" : "#94a3b8",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, background: "rgba(15, 23, 42, 0.8)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { label: "All Floors", value: "ALL" as const },
            { label: "Floor 1", value: 1 },
            { label: "Floor 2", value: 2 },
            { label: "Floor 3", value: 3 },
          ].map((f) => (
            <button
              key={f.label}
              onClick={() => setFilterFloor(f.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                background: filterFloor === f.value ? "#38bdf8" : "transparent",
                color: filterFloor === f.value ? "#fff" : "#94a3b8",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: "auto" }}>
          Showing <strong>{filteredRooms.length}</strong> rooms
        </span>
      </div>

      {/* Room Cleaning Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {filteredRooms.map((room) => {
          const statusColors: Record<string, { bg: string; text: string }> = {
            DIRTY: { bg: "rgba(239, 68, 68, 0.2)", text: "#f87171" },
            CLEANING: { bg: "rgba(245, 158, 11, 0.2)", text: "#fbbf24" },
            INSPECTING: { bg: "rgba(56, 189, 248, 0.2)", text: "#38bdf8" },
            CLEAN: { bg: "rgba(34, 197, 94, 0.2)", text: "#4ade80" },
          };
          const colors = statusColors[room.cleaning_status] || statusColors.CLEAN;

          return (
            <div
              key={room.id}
              style={{
                borderRadius: 14,
                padding: "16px",
                background: "rgba(30, 41, 59, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                  #{room.room_number}
                </span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "#cbd5e1" }}>
                  Floor {room.floor} • {room.block === "BLOCK_A" ? "A" : "B"}
                </span>
              </div>

              {/* Cleaning State Transition Button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Cleaning State:</span>
                <button
                  disabled={isPending}
                  onClick={() => handleCycleStatus(room)}
                  title="Click to advance status"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: colors.bg,
                    color: colors.text,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {room.cleaning_status} &rarr;
                </button>
              </div>

              {/* Guest Headcount Audit */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "8px 10px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Guests Audit:</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {/* Adults */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <span>👤 {room.adult_count || 0}</span>
                    <button onClick={() => handleHeadcountChange(room, 1, 0)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "#334155", color: "#fff", cursor: "pointer", fontSize: 10 }}>+</button>
                    <button onClick={() => handleHeadcountChange(room, -1, 0)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "#334155", color: "#fff", cursor: "pointer", fontSize: 10 }}>-</button>
                  </div>
                  {/* Children */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <span>🧒 {room.child_count || 0}</span>
                    <button onClick={() => handleHeadcountChange(room, 0, 1)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "#334155", color: "#fff", cursor: "pointer", fontSize: 10 }}>+</button>
                    <button onClick={() => handleHeadcountChange(room, 0, -1)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "#334155", color: "#fff", cursor: "pointer", fontSize: 10 }}>-</button>
                  </div>
                </div>
              </div>

              {/* Inspection Checklist Button */}
              <button
                onClick={() => setInspectingRoom(room)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📋 Room Inspection Checklist
              </button>
            </div>
          );
        })}
      </div>

      {/* INSPECTION CHECKLIST MODAL */}
      {inspectingRoom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, maxWidth: 480, width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#38bdf8" }}>
                Inspection: Room #{inspectingRoom.room_number}
              </h3>
              <button onClick={() => setInspectingRoom(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {[
                { key: "bedding" as const, label: "🛏️ Fresh Linen & Bedding Checked" },
                { key: "bathroom" as const, label: "🚿 Bathroom Sanitized & Towels Restocked" },
                { key: "minibar" as const, label: "🍫 Minibar & Amenities Full" },
                { key: "electronics" as const, label: "💡 A/C, Lights & TV Operational" },
              ].map((item) => (
                <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#cbd5e1", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                    style={{ cursor: "pointer" }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Escalate Fault to Maintenance */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 4 }}>
                ⚠️ Found a Broken Item? (Escalate to Maintenance)
              </label>
              <input
                type="text"
                placeholder="e.g. Broken hair dryer, cracked tile, A/C leak..."
                value={brokenItemNote}
                onChange={(e) => setBrokenItemNote(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12, boxSizing: "border-box", marginBottom: 8 }}
              />
              <button
                disabled={isPending || !brokenItemNote.trim()}
                onClick={() => handleEscalateMaintenance(inspectingRoom.id)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "none",
                  background: brokenItemNote.trim() ? "#ef4444" : "#475569",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: brokenItemNote.trim() ? "pointer" : "not-allowed",
                }}
              >
                🚨 Log Maintenance Ticket for Room #{inspectingRoom.room_number}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => {
                  alert(`Room ${inspectingRoom.room_number} inspection completed!`);
                  setInspectingRoom(null);
                }}
                style={{ padding: "8px 16px", borderRadius: 8, background: "#16a34a", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}
              >
                Pass Inspection (Clean)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
