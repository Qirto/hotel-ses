"use client";

import React, { useState, useMemo } from "react";
import { HotelRoom } from "@/utils/roomsData";

interface Props {
  initialRooms: HotelRoom[];
  isLiveSupabase: boolean;
}

export default function HotelDashboard({ initialRooms, isLiveSupabase }: Props) {
  const [rooms] = useState<HotelRoom[]>(initialRooms);
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<"ALL" | "BLOCK_A" | "BLOCK_B">("ALL");
  const [selectedFloor, setSelectedFloor] = useState<number | "ALL">("ALL");
  const [selectedCleaning, setSelectedCleaning] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"rooms" | "erd">("rooms");

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedBlock !== "ALL" && r.block !== selectedBlock) return false;
      if (selectedFloor !== "ALL" && r.floor !== selectedFloor) return false;
      if (selectedCleaning !== "ALL" && r.cleaning_status !== selectedCleaning) return false;
      if (search.trim() && !r.room_number.includes(search.trim())) return false;
      return true;
    });
  }, [rooms, selectedBlock, selectedFloor, selectedCleaning, search]);

  const blockACount = rooms.filter((r) => r.block === "BLOCK_A").length;
  const blockBCount = rooms.filter((r) => r.block === "BLOCK_B").length;

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "2rem 1.5rem", color: "#f8fafc" }}>
      {/* Header */}
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 999, background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)", color: "#38bdf8", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
              <span>🏨 Hotel Management System</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLiveSupabase ? "#22c55e" : "#f59e0b" }}></span>
              <span style={{ fontSize: 11, opacity: 0.9 }}>{isLiveSupabase ? "Supabase Live" : "Schema Configured"}</span>
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "4px 0", letterSpacing: "-0.03em", background: "linear-gradient(135deg, #ffffff 40%, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Room Operations & Maintenance
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0 }}>
              Database models: ROOMS, RESIDENTS, STAFF, and RECLAMATIONS (Prices removed).
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Rooms</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>{rooms.length}</div>
            </div>
            <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Block A</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{blockACount}</div>
            </div>
            <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Block B</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#a855f7" }}>{blockBCount}</div>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setActiveTab("rooms")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: activeTab === "rooms" ? "#38bdf8" : "rgba(255,255,255,0.1)",
              background: activeTab === "rooms" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: activeTab === "rooms" ? "#38bdf8" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            📋 Rooms List ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab("erd")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: activeTab === "erd" ? "#a855f7" : "rgba(255,255,255,0.1)",
              background: activeTab === "erd" ? "rgba(168, 85, 247, 0.15)" : "transparent",
              color: activeTab === "erd" ? "#c084fc" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            🗄️ Relational Schema (ERD & Tables)
          </button>
        </div>
      </header>

      {activeTab === "erd" ? (
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem" }}>Hotel System Database Architecture (ERD)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#38bdf8", marginBottom: 8 }}>ROOM (341 rows)</div>
              <ul style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                <li><code>id</code> (bigint PK)</li>
                <li><code>room_number</code> (text UNIQUE)</li>
                <li><code>floor</code> (int 1, 2, 3)</li>
                <li><code>block</code> (BLOCK_A, BLOCK_B)</li>
                <li><code>is_occupied</code> (boolean)</li>
                <li><code>cleaning_status</code> (DIRTY, CLEANING, INSPECTING, CLEAN)</li>
                <li><code>qr_code_hash</code> (door QR hash)</li>
              </ul>
            </div>

            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399", marginBottom: 8 }}>RESIDENT</div>
              <ul style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                <li><code>id</code> (bigint PK)</li>
                <li><code>room_id</code> (bigint FK &rarr; ROOM)</li>
                <li><code>first_name</code>, <code>last_name</code></li>
                <li><code>phone_number</code></li>
                <li><code>check_in_date</code>, <code>check_out_date</code></li>
                <li><code>status</code> (ACTIVE, CHECKED_OUT)</li>
              </ul>
            </div>

            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>STAFF</div>
              <ul style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                <li><code>id</code> (bigint PK)</li>
                <li><code>full_name</code></li>
                <li><code>role</code> (master, manager, receptionist, maintenance, governance)</li>
                <li><code>department</code> (RECEPTION, HOUSEKEEPING, TECHNICAL, MANAGEMENT)</li>
                <li><code>shift_status</code> (ON_SHIFT, OFF_SHIFT, ON_BREAK)</li>
              </ul>
            </div>

            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>RECLAMATION</div>
              <ul style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                <li><code>id</code> (bigint PK)</li>
                <li><code>room_id</code> (FK &rarr; ROOM)</li>
                <li><code>resident_id</code> (FK &rarr; RESIDENT)</li>
                <li><code>created_by_staff_id</code> (FK &rarr; STAFF)</li>
                <li><code>assigned_staff_id</code> (FK &rarr; STAFF)</li>
                <li><code>department</code> (MAINTENANCE, GOVERNANCE)</li>
                <li><code>priority</code>, <code>status</code></li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: "2rem" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Search Room Number</label>
              <input
                type="text"
                placeholder="Search (e.g. 1001, 2071, 3091)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "#f8fafc",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Block</label>
              <div style={{ display: "flex", gap: 6, background: "rgba(15, 23, 42, 0.8)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
                {(["ALL", "BLOCK_A", "BLOCK_B"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBlock(b)}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: selectedBlock === b ? "#2563eb" : "transparent",
                      color: selectedBlock === b ? "#ffffff" : "#94a3b8",
                    }}
                  >
                    {b === "ALL" ? "All" : b === "BLOCK_A" ? "Block A" : "Block B"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Floor Level</label>
              <div style={{ display: "flex", gap: 4, background: "rgba(15, 23, 42, 0.8)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
                {[
                  { label: "All", value: "ALL" as const },
                  { label: "Floor 1", value: 1 },
                  { label: "Floor 2", value: 2 },
                  { label: "Floor 3", value: 3 },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setSelectedFloor(f.value)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: selectedFloor === f.value ? "#3b82f6" : "transparent",
                      color: selectedFloor === f.value ? "#ffffff" : "#94a3b8",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Cleaning Status</label>
              <select
                value={selectedCleaning}
                onChange={(e) => setSelectedCleaning(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "#f8fafc",
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="CLEAN">CLEAN</option>
                <option value="DIRTY">DIRTY</option>
                <option value="CLEANING">CLEANING</option>
                <option value="INSPECTING">INSPECTING</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: "#94a3b8" }}>
              Showing <strong style={{ color: "#f8fafc" }}>{filteredRooms.length}</strong> matching rooms
            </span>
          </div>

          {/* Room Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {filteredRooms.map((room) => {
              return (
                <div
                  key={room.room_number}
                  style={{
                    borderRadius: 14,
                    padding: "14px",
                    background: "linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                      #{room.room_number}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: room.block === "BLOCK_A" ? "rgba(56, 189, 248, 0.2)" : "rgba(168, 85, 247, 0.2)",
                        color: room.block === "BLOCK_A" ? "#38bdf8" : "#c084fc",
                      }}
                    >
                      {room.block === "BLOCK_A" ? "Block A" : "Block B"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
                    <span>Floor {room.floor}</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: room.is_occupied ? "#f59e0b" : "#22c55e",
                      }}
                    >
                      {room.is_occupied ? "Occupied" : "Empty"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "#4ade80",
                        fontWeight: 600,
                      }}
                    >
                      {room.cleaning_status}
                    </span>
                    <span
                      title={room.qr_code_hash}
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "#64748b",
                        maxWidth: 70,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {room.qr_code_hash}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
