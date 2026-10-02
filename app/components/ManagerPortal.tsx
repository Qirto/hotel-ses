"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { HotelRoom, Reclamation, Staff } from "@/utils/roomsData";
import PortalLayout from "@/app/components/PortalLayout";
import { computeAllRoomsAnalytics, RoomAnalyticsSummary } from "@/utils/roomAnalytics";
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

export default function ManagerPortal({ rooms, reclamations, staff, isLiveSupabase = false }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"STATS" | "ROOMS" | "RECLAMATIONS" | "ANALYTICS">("STATS");
  const [ticketFilter, setTicketFilter] = useState<string>("ALL");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("ALL");
  const [remedyNote, setRemedyNote] = useState("");
  const [selectedRecId, setSelectedRecId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Analytics Filter States
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsFloorFilter, setAnalyticsFloorFilter] = useState<number | "ALL">("ALL");
  const [analyticsBlockFilter, setAnalyticsBlockFilter] = useState<string | "ALL">("ALL");
  const [analyticsSort, setAnalyticsSort] = useState<"MOST_TICKETS" | "RUSH_HOUR" | "ROOM_NUMBER" | "OPEN_TICKETS">("MOST_TICKETS");

  // Real-time synchronization
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-manager")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reclamations" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLiveSupabase, router]);

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

  // Room Analytics computation
  const roomAnalyticsMap = useMemo(() => {
    return computeAllRoomsAnalytics(rooms, reclamations);
  }, [rooms, reclamations]);

  const filteredAnalyticsRooms = useMemo(() => {
    const list = rooms.filter((r) => {
      if (analyticsSearch && !r.room_number.includes(analyticsSearch.trim())) return false;
      if (analyticsFloorFilter !== "ALL" && r.floor !== analyticsFloorFilter) return false;
      if (analyticsBlockFilter !== "ALL" && r.block !== analyticsBlockFilter) return false;
      return true;
    });

    return list.sort((a, b) => {
      const statsA = roomAnalyticsMap.get(a.id);
      const statsB = roomAnalyticsMap.get(b.id);
      if (analyticsSort === "MOST_TICKETS") {
        return (statsB?.totalTickets || 0) - (statsA?.totalTickets || 0);
      }
      if (analyticsSort === "OPEN_TICKETS") {
        return (statsB?.openTickets || 0) - (statsA?.openTickets || 0);
      }
      if (analyticsSort === "RUSH_HOUR") {
        return (statsB?.rushHour?.count || 0) - (statsA?.rushHour?.count || 0);
      }
      return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
    });
  }, [rooms, roomAnalyticsMap, analyticsSearch, analyticsFloorFilter, analyticsBlockFilter, analyticsSort]);

  // Analytics Metrics Overview
  const analyticsSummary = useMemo<{
    roomsWithIssues: number;
    roomsWithRush: number;
    maxTicketsRoom: { roomNumber: string; count: number } | null;
    totalAllTickets: number;
  }>(() => {
    let roomsWithIssues = 0;
    let roomsWithRush = 0;
    let maxTicketsRoom: { roomNumber: string; count: number } | null = null;
    let totalAllTickets = 0;

    roomAnalyticsMap.forEach((stats) => {
      if (stats.totalTickets > 0) {
        roomsWithIssues++;
        totalAllTickets += stats.totalTickets;
        if (!maxTicketsRoom || stats.totalTickets > maxTicketsRoom.count) {
          maxTicketsRoom = { roomNumber: stats.roomNumber, count: stats.totalTickets };
        }
      }
      if (stats.rushHour) {
        roomsWithRush++;
      }
    });

    return {
      roomsWithIssues,
      roomsWithRush,
      maxTicketsRoom,
      totalAllTickets,
    };
  }, [roomAnalyticsMap]);

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
    <PortalLayout
      departmentName="General Manager"
      departmentColor="#fbbf24"
      departmentCode="GM"
      sidebar={
        <>
          <div>
            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  margin: 0,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  borderLeft: "3px solid #fbbf24",
                  paddingLeft: 10,
                }}
              >
                General Manager
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8b97a8", paddingLeft: 10 }}>
                Executive Operations
              </p>
            </div>

            {/* VERTICAL NAV TABS */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.5rem" }}>
              {[
                { id: "STATS", label: "Executive Analytics", count: null, color: "#fbbf24" },
                { id: "ROOMS", label: "Rooms Matrix", count: totalRooms, color: "#38bdf8" },
                { id: "RECLAMATIONS", label: "Reclamations", count: reclamations.length, color: "#e879f9" },
                { id: "ANALYTICS", label: "Room Analytics", count: totalRooms, color: "#f59e0b" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor: isActive ? tab.color : "rgba(255, 255, 255, 0.06)",
                      background: isActive ? `rgba(251, 191, 36, 0.15)` : "rgba(15, 23, 42, 0.5)",
                      color: isActive ? "#ffffff" : "#c1cad8",
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
                        className="font-mono"
                        style={{
                          padding: "2px 7px",
                          borderRadius: 4,
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

            {/* STACKED EXECUTIVE KPIS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ background: "#1a2234", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#c1cad8" }}>Occupancy Rate</span>
                <strong className="font-mono" style={{ fontSize: 13, color: "#fbbf24" }}>{Math.round((occupiedRoomsCount / (totalRooms || 1)) * 100)}%</strong>
              </div>
              <div style={{ background: "#1a2234", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#c1cad8" }}>SLA Compliance</span>
                <strong className="font-mono" style={{ fontSize: 13, color: "#4ade80" }}>{slaCompliance}%</strong>
              </div>
              <div style={{ background: "#1a2234", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#c1cad8" }}>Average MTTR</span>
                <strong className="font-mono" style={{ fontSize: 13, color: "#38bdf8" }}>{mttrMinutes} min</strong>
              </div>
            </div>
          </div>

          {/* SIDEBAR FOOTER */}
          <div style={{ marginTop: "1.5rem" }}>
            <button
              className="btn-primary"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await logoutRole();
                  window.location.href = "/login";
                });
              }}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Sign Out
            </button>
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#8b97a8" }}>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>Privacy Notice</a>
              {" • "}
              <a href="/tos" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>AUP</a>
            </div>
          </div>
        </>
      }
    >
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

        {/* TAB 4: ROOM ANALYTICS, RUSH HOUR & REPEATED PROBLEMS */}
        {activeTab === "ANALYTICS" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* TOP HEADER & CONTROLS */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                borderRadius: 16,
                padding: "1.5rem",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#f59e0b", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                    <span>📈 INCIDENT INTELLIGENCE & PATTERNS</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#ffffff" }}>
                    Room Rush Hour & Pattern Analytics
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
                    Detailed breakdown of each room: current status, peak complaint hours with exact dates, and top repeated complaints.
                  </p>
                </div>

                {/* SUMMARY CHIPS */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: "8px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Active Rooms with Issues</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>{analyticsSummary.roomsWithIssues} / {totalRooms}</div>
                  </div>
                  <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: "8px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Identified Rush Hours</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>{analyticsSummary.roomsWithRush} rooms</div>
                  </div>
                  {analyticsSummary.maxTicketsRoom && (
                    <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: "8px 14px", borderRadius: 12, border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                      <div style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>Highest Incident Room</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#f87171" }}>
                        Room {analyticsSummary.maxTicketsRoom.roomNumber} ({analyticsSummary.maxTicketsRoom.count} tickets)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                {/* Search */}
                <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search by room number (e.g. 101, 204)..."
                    value={analyticsSearch}
                    onChange={(e) => setAnalyticsSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  {analyticsSearch && (
                    <button
                      onClick={() => setAnalyticsSearch("")}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Floor Filter */}
                <select
                  value={analyticsFloorFilter}
                  onChange={(e) => setAnalyticsFloorFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="ALL">🏢 All Floors</option>
                  <option value="1">Floor 1</option>
                  <option value="2">Floor 2</option>
                  <option value="3">Floor 3</option>
                </select>

                {/* Block Filter */}
                <select
                  value={analyticsBlockFilter}
                  onChange={(e) => setAnalyticsBlockFilter(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="ALL">🏛️ All Blocks</option>
                  <option value="BLOCK_A">Block A</option>
                  <option value="BLOCK_B">Block B</option>
                </select>

                {/* Sort Order */}
                <select
                  value={analyticsSort}
                  onChange={(e) => setAnalyticsSort(e.target.value as any)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#fbbf24",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="MOST_TICKETS">Sort: 📉 Most Incidents First</option>
                  <option value="OPEN_TICKETS">Sort: ⚠️ Most Open Issues</option>
                  <option value="RUSH_HOUR">Sort: ⏰ Highest Rush Hour Spike</option>
                  <option value="ROOM_NUMBER">Sort: 🔢 Room Number</option>
                </select>
              </div>
            </div>

            {/* ROOM CARDS GRID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
                gap: 16,
              }}
            >
              {filteredAnalyticsRooms.map((room) => {
                const stats = roomAnalyticsMap.get(room.id) || {
                  roomId: room.id,
                  roomNumber: room.room_number,
                  totalTickets: 0,
                  resolvedTickets: 0,
                  openTickets: 0,
                  hasEmergency: false,
                  hasHighPriority: false,
                  rushHour: null,
                  topProblems: [],
                  avgResolutionMinutes: null,
                  lastReclamationDate: null,
                };

                // Determine border and accent styling based on severity
                let borderColor = "rgba(255, 255, 255, 0.08)";
                let glowShadow = "none";
                let statusHeaderBadge = null;

                if (stats.hasEmergency || stats.hasHighPriority) {
                  borderColor = "rgba(239, 68, 68, 0.6)";
                  glowShadow = "0 0 20px rgba(239, 68, 68, 0.2)";
                  statusHeaderBadge = (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#f87171", fontSize: 10, fontWeight: 800 }}>
                      🔥 CRITICAL OPEN
                    </span>
                  );
                } else if (stats.openTickets > 0) {
                  borderColor = "rgba(245, 158, 11, 0.5)";
                  glowShadow = "0 0 15px rgba(245, 158, 11, 0.15)";
                  statusHeaderBadge = (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(245, 158, 11, 0.2)", border: "1px solid #f59e0b", color: "#fbbf24", fontSize: 10, fontWeight: 800 }}>
                      ⚠️ {stats.openTickets} OPEN
                    </span>
                  );
                } else if (stats.totalTickets > 0) {
                  borderColor = "rgba(56, 189, 248, 0.3)";
                  statusHeaderBadge = (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 10, fontWeight: 700 }}>
                      ✅ ALL RESOLVED
                    </span>
                  );
                } else {
                  statusHeaderBadge = (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(74, 222, 128, 0.1)", border: "1px solid rgba(74, 222, 128, 0.2)", color: "#4ade80", fontSize: 10, fontWeight: 700 }}>
                      ✨ CLEAN RECORD
                    </span>
                  );
                }

                return (
                  <div
                    key={room.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: `1.5px solid ${borderColor}`,
                      borderRadius: 16,
                      padding: "1.25rem",
                      boxShadow: glowShadow,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 14,
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                    }}
                  >
                    <div>
                      {/* CARD HEADER */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>
                              Room {room.room_number}
                            </h4>
                            {statusHeaderBadge}
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                            Floor {room.floor} • {room.block === "BLOCK_A" ? "Block A" : "Block B"}
                          </div>
                        </div>

                        {/* Occupancy & Cleaning Pills */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: room.is_occupied ? "rgba(251, 191, 36, 0.2)" : "rgba(74, 222, 128, 0.15)",
                              color: room.is_occupied ? "#fbbf24" : "#4ade80",
                              border: `1px solid ${room.is_occupied ? "rgba(251, 191, 36, 0.4)" : "rgba(74, 222, 128, 0.3)"}`,
                            }}
                          >
                            {room.is_occupied ? "🔴 Occupied" : "🟢 Vacant"}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              background:
                                room.cleaning_status === "CLEAN"
                                  ? "rgba(74, 222, 128, 0.15)"
                                  : room.cleaning_status === "DIRTY"
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : "rgba(56, 189, 248, 0.15)",
                              color:
                                room.cleaning_status === "CLEAN"
                                  ? "#4ade80"
                                  : room.cleaning_status === "DIRTY"
                                  ? "#f87171"
                                  : "#38bdf8",
                            }}
                          >
                            🧹 {room.cleaning_status}
                          </span>
                        </div>
                      </div>

                      {/* RUSH HOUR PANEL */}
                      <div
                        style={{
                          background: stats.rushHour ? "rgba(245, 158, 11, 0.08)" : "rgba(30, 41, 59, 0.4)",
                          border: `1px solid ${stats.rushHour ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.05)"}`,
                          borderRadius: 12,
                          padding: "10px 12px",
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: stats.rushHour ? "#fbbf24" : "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>⏰ RUSH HOUR & PEAK TIME</span>
                          </span>
                          {stats.rushHour && (
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "#f59e0b", color: "#000" }}>
                              {stats.rushHour.count} in 1 hr
                            </span>
                          )}
                        </div>

                        {stats.rushHour ? (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
                                {stats.rushHour.hourRange}
                              </span>
                              <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>
                                Date: {stats.rushHour.date}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                              Spike of {stats.rushHour.count} reclamation(s) on {stats.rushHour.date} ({stats.rushHour.totalForHourOfDay} total occurrences during this hour slot across all history).
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                            No rush hour pattern recorded yet (0 historical incidents).
                          </div>
                        )}
                      </div>

                      {/* MOST REPEATED PROBLEMS PANEL */}
                      <div
                        style={{
                          background: "rgba(30, 41, 59, 0.4)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#e879f9", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <span>🔁 MOST REPEATED PROBLEMS</span>
                        </div>

                        {stats.topProblems.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {stats.topProblems.map((prob, idx) => (
                              <div key={prob.category}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                                  <span style={{ color: "#cbd5e1", fontWeight: 600 }}>
                                    <span style={{ color: "#94a3b8", marginRight: 4 }}>#{idx + 1}</span>
                                    {prob.category}
                                  </span>
                                  <span style={{ color: "#e879f9", fontWeight: 800 }}>
                                    {prob.count}× <span style={{ color: "#94a3b8", fontSize: 11 }}>({prob.percentage}%)</span>
                                  </span>
                                </div>
                                {/* Bar indicator */}
                                <div style={{ height: 5, borderRadius: 999, background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${prob.percentage}%`,
                                      borderRadius: 999,
                                      background:
                                        idx === 0
                                          ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                                          : idx === 1
                                          ? "linear-gradient(90deg, #38bdf8, #818cf8)"
                                          : "#94a3b8",
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                            No complaints reported for this room.
                          </div>
                        )}
                      </div>

                      {/* STATS SUMMARY ROW */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 6,
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(15, 23, 42, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          fontSize: 11,
                          textAlign: "center",
                        }}
                      >
                        <div>
                          <div style={{ color: "#94a3b8" }}>Total</div>
                          <div style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>{stats.totalTickets}</div>
                        </div>
                        <div>
                          <div style={{ color: "#94a3b8" }}>Resolved</div>
                          <div style={{ fontWeight: 800, color: "#4ade80", fontSize: 13 }}>{stats.resolvedTickets}</div>
                        </div>
                        <div>
                          <div style={{ color: "#94a3b8" }}>Open</div>
                          <div style={{ fontWeight: 800, color: stats.openTickets > 0 ? "#f87171" : "#94a3b8", fontSize: 13 }}>{stats.openTickets}</div>
                        </div>
                        <div>
                          <div style={{ color: "#94a3b8" }}>Avg Fix</div>
                          <div style={{ fontWeight: 800, color: "#38bdf8", fontSize: 13 }}>
                            {stats.avgResolutionMinutes !== null ? `${stats.avgResolutionMinutes}m` : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD ACTION BUTTON */}
                    <button
                      onClick={() => {
                        setSelectedRoomModal(room);
                        setModalTab("ROOM_STAT");
                      }}
                      style={{
                        width: "100%",
                        padding: "9px",
                        borderRadius: 10,
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        color: "#fbbf24",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>🔍 Inspect Room History & Actions &rarr;</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* ROOM POP-UP MODAL */}
      {selectedRoomModal && (
        <div className="portal-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div className="portal-modal-content" style={{ background: "#0f172a", border: "1.5px solid rgba(251, 191, 36, 0.4)", borderRadius: 20, maxWidth: 840, width: "100%", height: 560, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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

                    {/* Rush Hour & Analytics Highlights in Modal */}
                    {(() => {
                      const stats = roomAnalyticsMap.get(selectedRoomModal.id);
                      if (!stats) return null;
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 10, padding: "10px" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24" }}>⏰ RUSH HOUR & PEAK INCIDENT TIME</div>
                            {stats.rushHour ? (
                              <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{stats.rushHour.hourRange}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>Busiest Date: {stats.rushHour.date} ({stats.rushHour.count} complaints in that hour)</div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginTop: 4 }}>No incidents recorded</div>
                            )}
                          </div>

                          <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#e879f9" }}>🔁 TOP REPEATED PROBLEMS</div>
                            {stats.topProblems.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                                {stats.topProblems.map((prob, idx) => (
                                  <div key={prob.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "#cbd5e1" }}>#{idx + 1} {prob.category}</span>
                                    <strong style={{ color: "#e879f9" }}>{prob.count}× ({prob.percentage}%)</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginTop: 4 }}>No problems recorded</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
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
    </PortalLayout>
  );
}
