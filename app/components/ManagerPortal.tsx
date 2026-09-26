"use client";

import React, { useState, useTransition, useMemo } from "react";
import { HotelRoom, Reclamation, Staff, isMaintenanceFixTicket, isHousekeepingMissingOrCleanTicket } from "@/utils/roomsData";
import { resolveConfidentialGrievance, createHistoricalReclamation, cycleRoomCleaning, resolveReclamation } from "@/app/actions";

interface Props {
  rooms: HotelRoom[];
  reclamations: Reclamation[];
  staff: Staff[];
}

export default function ManagerPortal({ rooms, reclamations, staff }: Props) {
  const [activeTab, setActiveTab] = useState<"STATS" | "RECLAMATIONS" | "ROOM_STATE">("STATS");
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

  // BDD Live Room Statistics
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

  // Department ticket counts
  const deptCounts: Record<string, number> = {};
  reclamations.forEach((r) => {
    deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Executive Header */}
      <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "1.25rem 1.5rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <span>👔 GENERAL MANAGER EXECUTIVE DASHBOARD</span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Palace Executive Oversight & Operations Analytics
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Executive view: analyze statistics & KPIs, monitor room state, and oversee all hotel reclamations.
            </p>
          </div>
        </div>

        {/* Executive Quick KPIs */}
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
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Confidential Issues</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: confidentialGrievances.length > 0 ? "#e879f9" : "#4ade80" }}>{confidentialGrievances.length}</div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
          <button
            onClick={() => setActiveTab("STATS")}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "STATS" ? "#fbbf24" : "rgba(255,255,255,0.08)",
              background: activeTab === "STATS" ? "rgba(251, 191, 36, 0.2)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "STATS" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>📊</span> 1. Executive Statistics & Analytics
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
            <span>🛎️</span> 2. Reclamations & Grievances ({reclamations.length})
          </button>
          <button
            onClick={() => setActiveTab("ROOM_STATE")}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: activeTab === "ROOM_STATE" ? "#38bdf8" : "rgba(255,255,255,0.08)",
              background: activeTab === "ROOM_STATE" ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "ROOM_STATE" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🔑</span> 3. Room State & Floor Matrix ({totalRooms})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE STATISTICS & ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === "STATS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Key Metric Overview Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>
                🏨 Room Occupancy Distribution
              </h4>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                {occupiedRoomsCount} / {totalRooms} Rooms
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 999, height: 10, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ background: "#fbbf24", width: `${(occupiedRoomsCount / (totalRooms || 1)) * 100}%`, height: "100%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
                <span>Occupied: {occupiedRoomsCount}</span>
                <span>Vacant: {totalRooms - occupiedRoomsCount}</span>
              </div>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#4ade80" }}>
                🧹 Housekeeping Floor Cleanliness
              </h4>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                {vacantCleanCount} Vacant Clean
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 999, height: 10, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ background: "#4ade80", width: `${(vacantCleanCount / (totalRooms || 1)) * 100}%`, height: "100%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
                <span>Dirty Rooms: {dirtyRoomsCount}</span>
                <span>In Progress: {cleaningCount}</span>
              </div>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#e879f9" }}>
                ⏱️ Resolution MTTR & Performance
              </h4>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                {mttrMinutes} Minutes Avg
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 999, height: 10, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ background: "#e879f9", width: `${slaCompliance}%`, height: "100%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
                <span>SLA Target: &lt; 30 min</span>
                <span>Compliance: {slaCompliance}%</span>
              </div>
            </div>
          </div>

          {/* Department Workload Breakdown */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "1.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 700, color: "#38bdf8" }}>
              🏢 Department Workload & Reclamations Distribution
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {Object.entries(deptCounts).map(([dept, count]) => {
                const openCount = reclamations.filter((r) => r.department === dept && (r.status === "OPEN" || r.status === "IN_PROGRESS")).length;
                return (
                  <div key={dept} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>{dept}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{count} Total Tickets</div>
                    <div style={{ fontSize: 11, color: openCount > 0 ? "#f87171" : "#4ade80", marginTop: 4 }}>
                      {openCount} Open / Pending
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Repeat Issue Hotspots */}
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
      {/* TAB 2: RECLAMATIONS & GRIEVANCES OVERSIGHT */}
      {/* ========================================================================= */}
      {activeTab === "RECLAMATIONS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* CONFIDENTIAL EXECUTIVE GRIEVANCES */}
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

          {/* ALL RECLAMATIONS TABLE */}
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

      {/* ========================================================================= */}
      {/* TAB 3: ROOM STATE & FLOOR MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "ROOM_STATE" && (
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

          {/* Rooms Grid */}
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
