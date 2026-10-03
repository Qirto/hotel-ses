"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { HotelRoom, Resident, Department, Reclamation, Staff } from "@/utils/roomsData";
import AppShell from "@/app/components/AppShell";
import { NavTabItem } from "@/app/components/BottomNav";
import FAB from "@/app/components/FAB";
import BottomSheet from "@/app/components/BottomSheet";
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
    { category: "Keycard", label: "💳 Keycard Reprogramming" },
  ],
};

const DEFAULT_PRESETS = [
  { category: "General", label: "📋 General Guest Request" },
  { category: "Urgent", label: "⚡ High-Priority Attention" },
];

export function formatIncidentDate(dateStr?: string | null) {
  if (!dateStr) return { formatted: "Recent", time: "", relative: "Just now", full: "Recent" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { formatted: "Recent", time: "", relative: "Just now", full: "Recent" };
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let relative = "Today";
  if (diffDays === 1) relative = "Yesterday";
  else if (diffDays > 1 && diffDays < 30) relative = `${diffDays}d ago`;
  else if (diffDays >= 30 && diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;
  else if (diffDays >= 365) relative = `${Math.floor(diffDays / 365)}y ago`;
  else if (diffDays < 0) relative = "Scheduled";

  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return { formatted, time, relative, full: `${formatted} • ${time}` };
}

export default function ReceptionPortal({
  rooms,
  departmentsList = [],
  reclamationsList = [],
  isLiveSupabase = false,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "ROOMS" | "RECLAMATIONS" | "STATS">("OVERVIEW");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Synchronized Reactive Reclamations State
  const [localReclamations, setLocalReclamations] = useState<Reclamation[]>(reclamationsList || []);
  useEffect(() => {
    if (reclamationsList) {
      setLocalReclamations(reclamationsList);
    }
  }, [reclamationsList]);

  // Rapid Incident Dispatch Modal (Bottom Sheet / FAB)
  const [showNewTicketSheet, setShowNewTicketSheet] = useState(false);
  const [quickRoom, setQuickRoom] = useState<string>("");
  const [quickDept, setQuickDept] = useState<string>("TECHNICAL");
  const [quickCategory, setQuickCategory] = useState<string>("A/C");
  const [quickPriority, setQuickPriority] = useState<"STANDARD" | "HIGH" | "EMERGENCY">("STANDARD");
  const [quickDesc, setQuickDesc] = useState<string>("");
  const [quickDate, setQuickDate] = useState<string>(new Date().toISOString().slice(0, 16));

  const handleQuickTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.room_number.toString() === quickRoom.toString().trim());
    if (!targetRoom) {
      alert("Please select or enter a valid room number!");
      return;
    }

    const optimisticRec: Reclamation = {
      id: Date.now(),
      room_id: targetRoom.id,
      room: targetRoom,
      department: quickDept,
      category: quickCategory,
      description: quickDesc.trim() || `${quickCategory} incident reported via Quick Dispatch`,
      priority: quickPriority,
      status: "OPEN",
      created_at: quickDate ? new Date(quickDate).toISOString() : new Date().toISOString(),
      is_confidential: false,
    };
    setLocalReclamations((prev) => [optimisticRec, ...prev]);

    startTransition(async () => {
      const res = await createRapidReclamation({
        roomId: targetRoom.id,
        department: quickDept,
        category: quickCategory,
        description: quickDesc.trim() || `${quickCategory} incident reported via Quick Dispatch`,
        priority: quickPriority,
        isConfidential: false,
      });
      if (res.success) {
        setMessage(`Incident dispatched for Room ${targetRoom.room_number}!`);
        setShowNewTicketSheet(false);
        setQuickDesc("");
        setQuickRoom("");
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  // Real-time synchronization
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-reception")
      .on("postgres_changes", { event: "*", schema: "public", table: "reclamations" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLiveSupabase, router]);

  // Room Pop-up Modal State
  const [selectedRoomModal, setSelectedRoomModal] = useState<HotelRoom | null>(null);
  const [modalTab, setModalTab] = useState<"RECLAMATIONS" | "ROOM_STAT">("ROOM_STAT");
  const [roomModalSubTab, setRoomModalSubTab] = useState<"ACTIVE" | "MOST_REPORTED" | "HISTORY" | "TIMELINE">("ACTIVE");

  // In-modal Past Incident Creation State
  const [showInModalPastLog, setShowInModalPastLog] = useState(false);
  const [inModalHistDate, setInModalHistDate] = useState(new Date().toISOString().slice(0, 16));
  const [inModalHistDept, setInModalHistDept] = useState("TECHNICAL");
  const [inModalHistCategory, setInModalHistCategory] = useState("A/C");
  const [inModalHistStatus, setInModalHistStatus] = useState<"OPEN" | "IN_PROGRESS" | "RESOLVED">("RESOLVED");
  const [inModalHistDesc, setInModalHistDesc] = useState("");

  // Specific Room Reclamations for Modal (using reactive local state)
  const roomModalReclamations = useMemo(() => {
    if (!selectedRoomModal) return [];
    return localReclamations.filter(
      (r) =>
        r.room_id === selectedRoomModal.id ||
        r.room?.room_number === selectedRoomModal.room_number
    );
  }, [localReclamations, selectedRoomModal]);

  // Active Reclamations for Room Modal
  const roomActiveReclamations = useMemo(() => {
    return roomModalReclamations.filter(
      (r) => r.status === "OPEN" || r.status === "IN_PROGRESS"
    );
  }, [roomModalReclamations]);

  // Chronologically Sorted Reclamations for Date Timeline
  const roomTimelineReclamations = useMemo(() => {
    return [...roomModalReclamations].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
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
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().slice(0, 16));

  // Filters for Room Grid
  const [roomSearch, setRoomSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OCCUPIED" | "VACANT" | "DIRTY">("ALL");

  // Filters for Reclamations Table
  const [recStatusFilter, setRecStatusFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [recDeptFilter, setRecDeptFilter] = useState<string>("ALL");
  const [recDateFilter, setRecDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH" | "ARCHIVE">("ALL");

  // Historical Ticket Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [histRoom, setHistRoom] = useState("");
  const [histDept, setHistDept] = useState<string>("TECHNICAL");
  const [histCategory, setHistCategory] = useState("A/C");
  const [histDesc, setHistDesc] = useState("");
  const [histDate, setHistDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
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

  // Filtered Reclamations (using reactive localReclamations + recDateFilter)
  const filteredReclamations = useMemo(() => {
    const now = new Date();
    return localReclamations.filter((rec) => {
      if (recStatusFilter !== "ALL" && rec.status !== recStatusFilter) return false;
      if (recDeptFilter !== "ALL" && rec.department !== recDeptFilter) return false;

      if (recDateFilter !== "ALL" && rec.created_at) {
        const ticketDate = new Date(rec.created_at);
        const diffMs = now.getTime() - ticketDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (recDateFilter === "TODAY" && diffDays > 1) return false;
        if (recDateFilter === "WEEK" && diffDays > 7) return false;
        if (recDateFilter === "MONTH" && diffDays > 30) return false;
        if (recDateFilter === "ARCHIVE" && diffDays <= 30) return false;
      }
      return true;
    });
  }, [localReclamations, recStatusFilter, recDeptFilter, recDateFilter]);

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
        setMessage(`Room ${room.room_number} set to ${nextStatus}.`);
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

    const optimisticRec: Reclamation = {
      id: Date.now(),
      room_id: selectedRoomModal.id,
      room: selectedRoomModal,
      department: modalDept,
      category: modalCategory,
      description: modalDesc.trim() || `${modalCategory} issue logged via Room Modal`,
      priority: modalPriority,
      status: "OPEN",
      created_at: modalDate ? new Date(modalDate).toISOString() : new Date().toISOString(),
      is_confidential: modalConfidential,
    };
    setLocalReclamations((prev) => [optimisticRec, ...prev]);

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

  // Create Historical Reclamation directly inside Room Modal
  const handleInModalHistoricalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomModal) return;

    const optimisticHist: Reclamation = {
      id: Date.now(),
      room_id: selectedRoomModal.id,
      room: selectedRoomModal,
      department: inModalHistDept,
      category: inModalHistCategory,
      description: inModalHistDesc.trim() || `Historical log for Room ${selectedRoomModal.room_number}`,
      priority: "STANDARD",
      status: inModalHistStatus,
      created_at: inModalHistDate ? new Date(inModalHistDate).toISOString() : new Date().toISOString(),
      resolved_at: inModalHistStatus === "RESOLVED" ? (inModalHistDate ? new Date(inModalHistDate).toISOString() : new Date().toISOString()) : undefined,
    };
    setLocalReclamations((prev) => [optimisticHist, ...prev]);

    startTransition(async () => {
      const res = await createHistoricalReclamation({
        roomId: selectedRoomModal.id,
        department: inModalHistDept,
        category: inModalHistCategory,
        description: inModalHistDesc.trim() || `Historical log for Room ${selectedRoomModal.room_number}`,
        status: inModalHistStatus,
        createdAt: inModalHistDate,
        isConfidential: false,
      });

      if (res.success) {
        setShowInModalPastLog(false);
        setInModalHistDesc("");
        setMessage(`✅ Historical incident added for Room ${selectedRoomModal.room_number}!`);
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  // Acknowledge Ticket
  const handleAcknowledgeTicket = (id: number) => {
    setLocalReclamations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "IN_PROGRESS" } : r))
    );
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
    setLocalReclamations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "RESOLVED", resolved_at: new Date().toISOString() } : r))
    );
    startTransition(async () => {
      const res = await resolveReclamation(id, "Resolved by Reception");
      if (res.success) {
        setMessage(`✅ Ticket #${id} marked RESOLVED.`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Submit Historical Ticket from Global Modal
  const handleHistoricalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.room_number.toString() === histRoom.toString().trim());
    if (!targetRoom) {
      alert("Invalid room number!");
      return;
    }

    const optimisticHist: Reclamation = {
      id: Date.now(),
      room_id: targetRoom.id,
      room: targetRoom,
      department: histDept,
      category: histCategory,
      description: histDesc || `Historical logbook entry for ${histCategory}`,
      priority: "STANDARD",
      status: histStatus,
      created_at: histDate ? new Date(histDate).toISOString() : new Date().toISOString(),
      resolved_at: histStatus === "RESOLVED" ? (histDate ? new Date(histDate).toISOString() : new Date().toISOString()) : undefined,
    };
    setLocalReclamations((prev) => [optimisticHist, ...prev]);

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

  // Summary Metrics (instantaneously updated from reactive localReclamations)
  const totalRooms = rooms.length;
  const occupiedCount = rooms.filter((r) => r.is_occupied).length;
  const dirtyCount = rooms.filter((r) => r.cleaning_status === "DIRTY").length;
  const vacantCleanCount = rooms.filter((r) => !r.is_occupied && r.cleaning_status === "CLEAN").length;
  const openReclamationsCount = localReclamations.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;

  const deptCounts: Record<string, number> = {};
  localReclamations.forEach((rec) => {
    deptCounts[rec.department] = (deptCounts[rec.department] || 0) + 1;
  });

  const urgentReclamations = localReclamations.filter(
    (r) => (r.status === "OPEN" || r.status === "IN_PROGRESS") && (r.priority === "HIGH" || r.priority === "EMERGENCY")
  );

  const navItems: NavTabItem[] = [
    {
      id: "OVERVIEW",
      label: "Overview",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      isActive: activeTab === "OVERVIEW",
      onClick: () => setActiveTab("OVERVIEW"),
    },
    {
      id: "ROOMS",
      label: "Rooms",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
          <path d="M8 7h.01" />
          <path d="M16 7h.01" />
          <path d="M12 7h.01" />
          <path d="M12 11h.01" />
        </svg>
      ),
      badge: totalRooms,
      isActive: activeTab === "ROOMS",
      onClick: () => setActiveTab("ROOMS"),
    },
    {
      id: "RECLAMATIONS",
      label: "Tickets",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      ),
      badge: openReclamationsCount > 0 ? openReclamationsCount : undefined,
      isActive: activeTab === "RECLAMATIONS",
      onClick: () => setActiveTab("RECLAMATIONS"),
    },
    {
      id: "STATS",
      label: "Stats",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      isActive: activeTab === "STATS",
      onClick: () => setActiveTab("STATS"),
    },
  ];

  return (
    <AppShell
      items={navItems}
      departmentName="Reception Operations"
      departmentCode="Reception"
      departmentColor="var(--accent-amber)"
      onSignOut={() => {
        startTransition(async () => {
          await logoutRole();
          window.location.href = "/login";
        });
      }}
      headerActions={
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "6px 10px",
            color: "var(--accent-amber)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>+ Backfill</span>
        </button>
      }
    >
      {message && (
        <div style={{ marginBottom: "1rem", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--accent-amber-bg)", border: "1px solid var(--accent-amber)", color: "var(--accent-amber)", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: OVERVIEW / DASHBOARD SUMMARY */}
      {/* ========================================================================= */}
      {activeTab === "OVERVIEW" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Top Hero Banner */}
          <div
            className="ses-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              background: "linear-gradient(135deg, var(--surface-card), var(--surface-2))",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Front Desk Overview
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                Live property matrix, guest requests, and room dispatch status.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowNewTicketSheet(true)}
                className="btn-primary"
                style={{
                  background: "var(--accent-amber)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>+ Dispatch Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Past Logbook
              </button>
            </div>
          </div>

          {/* KPI Metrics Matrix */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div className="ses-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("ROOMS")}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Occupied Rooms</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <span className="font-mono" style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-amber)" }}>
                  {occupiedCount}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  / {totalRooms} ({Math.round((occupiedCount / (totalRooms || 1)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="ses-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("ROOMS")}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Vacant Clean</div>
              <div style={{ marginTop: 6 }}>
                <span className="font-mono" style={{ fontSize: 26, fontWeight: 800, color: "var(--status-emerald)" }}>
                  {vacantCleanCount}
                </span>
              </div>
            </div>

            <div className="ses-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("ROOMS")}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Dirty Rooms</div>
              <div style={{ marginTop: 6 }}>
                <span className="font-mono" style={{ fontSize: 26, fontWeight: 800, color: dirtyCount > 0 ? "var(--status-rose)" : "var(--status-emerald)" }}>
                  {dirtyCount}
                </span>
              </div>
            </div>

            <div className="ses-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("RECLAMATIONS")}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Open Reclamations</div>
              <div style={{ marginTop: 6 }}>
                <span className="font-mono" style={{ fontSize: 26, fontWeight: 800, color: openReclamationsCount > 0 ? "var(--status-amber)" : "var(--status-emerald)" }}>
                  {openReclamationsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Urgent Incident Queue */}
          <div className="ses-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: urgentReclamations.length > 0 ? "var(--status-rose)" : "var(--status-emerald)" }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  High-Priority Incidents ({urgentReclamations.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("RECLAMATIONS")}
                style={{ background: "transparent", border: "none", color: "var(--accent-amber)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                View All Tickets →
              </button>
            </div>

            {urgentReclamations.length === 0 ? (
              <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                All high-priority queues are clear. No pending escalations.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {urgentReclamations.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--status-rose)", background: "var(--status-rose-bg)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>
                          {rec.priority}
                        </span>
                        <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>
                          Room {rec.room?.room_number || rec.room_id} • {rec.category}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({rec.department})</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                        {rec.description}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {rec.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeTicket(rec.id)}
                          style={{
                            background: "var(--surface-3)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            padding: "6px 10px",
                            color: "var(--text-primary)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResolveTicket(rec.id)}
                        style={{
                          background: "var(--status-emerald)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ROOMS GRID */}
      {/* ========================================================================= */}
        {activeTab === "ROOMS" && (
          <div className="ses-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Rooms Matrix ({filteredRooms.length} rooms)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                  Select any room card to inspect stay details, service requests, and history.
                </p>
              </div>

              {/* Room Grid Filters */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Search room #..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                />

                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                >
                  <option value="ALL">All Floors</option>
                  <option value={1}>Floor 1</option>
                  <option value={2}>Floor 2</option>
                  <option value={3}>Floor 3</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OCCUPIED">Occupied Only</option>
                  <option value="VACANT">Vacant Only</option>
                  <option value="DIRTY">Dirty Only</option>
                </select>
              </div>
            </div>

            {/* Room Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(160px, 100%), 1fr))", gap: 10, maxHeight: "65vh", overflowY: "auto", paddingRight: 4 }}>
              {filteredRooms.map((room) => {
                const isDirty = room.cleaning_status === "DIRTY";
                const isClean = room.cleaning_status === "CLEAN";
                const roomTickets = localReclamations.filter((r) => r.room_id === room.id || r.room?.room_number === room.room_number);
                const roomTicketCount = roomTickets.length;
                const hasActiveIncident = roomTickets.some((r) => r.status === "OPEN" || r.status === "IN_PROGRESS");

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomModal(room);
                      setModalTab("ROOM_STAT");
                    }}
                    className="room-matrix-card"
                    style={{
                      border: "1.5px solid",
                      borderColor: hasActiveIncident
                        ? "var(--status-amber)"
                        : isDirty
                        ? "var(--status-rose)"
                        : isClean
                        ? "var(--status-emerald)"
                        : "var(--border-default)",
                      background: "var(--surface-card)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Room {room.room_number}</span>
                        {hasActiveIncident && (
                          <span title="Active incident in progress" style={{ fontSize: 11 }}>⚠️</span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: "var(--radius-sm)",
                          background: room.is_occupied ? "var(--status-amber-bg)" : "var(--status-emerald-bg)",
                          color: room.is_occupied ? "var(--status-amber)" : "var(--status-emerald)",
                          border: `1px solid ${room.is_occupied ? "var(--status-amber)" : "var(--status-emerald)"}`,
                          fontWeight: 800,
                        }}
                      >
                        {room.is_occupied ? "Occupied" : "Vacant"}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Floor {room.floor} • {room.block?.replace("_", " ") || "Main"}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: isDirty ? "var(--status-rose)" : isClean ? "var(--status-emerald)" : "var(--status-amber)", fontWeight: 700 }}>
                        {isDirty ? "DIRTY" : isClean ? "CLEAN" : room.cleaning_status}
                      </span>
                      {roomTicketCount > 0 && (
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: "var(--radius-sm)", background: hasActiveIncident ? "var(--status-rose-bg)" : "var(--status-purple-bg)", color: hasActiveIncident ? "var(--status-rose)" : "var(--status-purple)", border: `1px solid ${hasActiveIncident ? "var(--status-rose)" : "var(--status-purple)"}`, fontWeight: 800 }}>
                          {roomTicketCount} {roomTicketCount === 1 ? "ticket" : "tickets"}
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
          <div className="ses-card">
            {/* Sticky Filter Header with Title, Status & Departments Pills + Dropdown */}
            <div className="tab-sticky-filter-bar">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    Reclamations Tracker & Dispatch ({filteredReclamations.length} tickets)
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    Live operational tickets across all departments with occurrence timestamps.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    value={recDateFilter}
                    onChange={(e) => setRecDateFilter(e.target.value as any)}
                    style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                  >
                    <option value="ALL">📅 All Dates</option>
                    <option value="TODAY">📅 Today Only</option>
                    <option value="WEEK">📅 Past 7 Days</option>
                    <option value="MONTH">📅 Past 30 Days</option>
                    <option value="ARCHIVE">📅 Older History</option>
                  </select>

                  <select
                    value={recStatusFilter}
                    onChange={(e) => setRecStatusFilter(e.target.value as any)}
                    style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">Open Only</option>
                    <option value="IN_PROGRESS">In Progress Only</option>
                    <option value="RESOLVED">Resolved Only</option>
                  </select>

                  <select
                    value={recDeptFilter}
                    onChange={(e) => setRecDeptFilter(e.target.value)}
                    style={{ padding: "7px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 13 }}
                  >
                    <option value="ALL">All Departments</option>
                    {allDepartments.map((d) => (
                      <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fixed / Sticky Horizontal Department Pills Row (Fast 1-tap filtering on Mobile & Desktop) */}
              <div className="filter-pills-row">
                <button
                  type="button"
                  onClick={() => setRecDeptFilter("ALL")}
                  className={`filter-pill-btn ${recDeptFilter === "ALL" ? "active" : ""}`}
                >
                  All Departments ({localReclamations.length})
                </button>
                {allDepartments.map((d) => {
                  const deptCount = localReclamations.filter((r: Reclamation) => r.department === d.code).length;
                  const displayIcon = d.icon && !d.icon.includes("?") ? d.icon : "🏢";
                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => setRecDeptFilter(d.code)}
                      className={`filter-pill-btn ${recDeptFilter === d.code ? "active" : ""}`}
                    >
                      {displayIcon} {d.name} ({deptCount})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="responsive-table-view">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px" }}>ID / Room</th>
                    <th style={{ padding: "10px" }}>Department</th>
                    <th style={{ padding: "10px" }}>Category / Description</th>
                    <th style={{ padding: "10px" }}>📅 Date & Time</th>
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
                    const dt = formatIncidentDate(rec.created_at);

                    return (
                      <tr key={rec.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "var(--accent-amber)" }}>#{rec.id} • {roomNum}</td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{rec.department}</td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{rec.category}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.description}</div>
                        </td>
                        <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{dt.formatted}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{dt.time} ({dt.relative})</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: rec.priority === "EMERGENCY" ? "var(--status-rose)" : rec.priority === "HIGH" ? "var(--status-amber)" : "var(--accent-amber-bg)", color: rec.priority === "EMERGENCY" || rec.priority === "HIGH" ? "#fff" : "var(--text-primary)" }}>
                            {rec.priority || "STANDARD"}
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: isResolved ? "var(--status-emerald-bg)" : "var(--status-rose-bg)", color: isResolved ? "var(--status-emerald)" : "var(--status-rose)" }}>
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          {!isResolved && (
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {isOpen && (
                                <button disabled={isPending} onClick={() => handleAcknowledgeTicket(rec.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "var(--surface-3)", border: "none", color: "var(--text-primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  In Progress
                                </button>
                              )}
                              <button disabled={isPending} onClick={() => handleResolveTicket(rec.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "var(--status-emerald)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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

            {/* Mobile Stacked Card View (< 768px) - NO horizontal scroll */}
            <div className="responsive-cards-view">
              {filteredReclamations.length === 0 ? (
                <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No incident tickets match the selected filters.
                </div>
              ) : (
                filteredReclamations.map((rec) => {
                  const roomNum = rec.room?.room_number || `Room ${rec.room_id}`;
                  const isResolved = rec.status === "RESOLVED";
                  const isOpen = rec.status === "OPEN";
                  const dt = formatIncidentDate(rec.created_at);

                  return (
                    <div key={rec.id} className="mobile-ticket-card">
                      {/* Top Header Row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-amber)" }}>
                            #{rec.id} • {roomNum}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--surface-2)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {rec.department}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: rec.priority === "EMERGENCY" ? "var(--status-rose)" : rec.priority === "HIGH" ? "var(--status-amber)" : "var(--accent-amber-bg)", color: rec.priority === "EMERGENCY" || rec.priority === "HIGH" ? "#fff" : "var(--text-primary)" }}>
                            {rec.priority || "STANDARD"}
                          </span>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: isResolved ? "var(--status-emerald-bg)" : "var(--status-rose-bg)", color: isResolved ? "var(--status-emerald)" : "var(--status-rose)" }}>
                            {rec.status}
                          </span>
                        </div>
                      </div>

                      {/* Date & Time Timestamp */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                        <span>📅 {dt.formatted}</span>
                        <span>•</span>
                        <span>{dt.time}</span>
                        <span>({dt.relative})</span>
                      </div>

                      {/* Content Body */}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                          {rec.category}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.4 }}>
                          {rec.description}
                        </div>
                      </div>

                      {/* Action Buttons for Mobile (Touch-friendly 44px) */}
                      {!isResolved && (
                        <div style={{ display: "flex", gap: 8, marginTop: 4, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                          {isOpen && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleAcknowledgeTicket(rec.id)}
                              style={{
                                flex: 1,
                                minHeight: 44,
                                padding: "8px 12px",
                                borderRadius: "var(--radius-md)",
                                background: "var(--surface-2)",
                                border: "1px solid var(--border-default)",
                                color: "var(--text-primary)",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              In Progress
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleResolveTicket(rec.id)}
                            style={{
                              flex: 1,
                              minHeight: 44,
                              padding: "8px 12px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--status-emerald)",
                              border: "none",
                              color: "#ffffff",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STATS & GRAPHS */}
        {/* ========================================================================= */}
        {activeTab === "STATS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <div className="ses-card">
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
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#38bdf8" }}>
                Department Ticket Demand Graph
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(deptCounts).map(([dept, count]) => {
                  const maxCount = Math.max(...Object.values(deptCounts), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={dept}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "#cbd5e1" }}>
                        <span>{dept}</span>
                        <strong className="font-mono" style={{ color: "#38bdf8" }}>{count} tickets</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#38bdf8", borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* ========================================================================= */}
      {/* INTERACTIVE ROOM POP-UP MODAL (WITH INTERNAL SIDEBAR: RECLAMATION & ROOM STAT) */}
      {/* ========================================================================= */}
      {selectedRoomModal && (
        <div className="portal-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div className="portal-modal-content" style={{ background: "#0f172a", border: "1.5px solid rgba(56, 189, 248, 0.4)", borderRadius: 20, maxWidth: 840, width: "100%", height: 560, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
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
                    {/* SUB-CATEGORY TAB SWITCHER FOR ROOM RECLAMATIONS (4 TABS) */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "4px", background: "rgba(15, 23, 42, 0.8)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("ACTIVE")}
                        style={{
                          padding: "8px 6px",
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
                          gap: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>⚡ Active</span>
                        {roomActiveReclamations.length > 0 && (
                          <span style={{ padding: "1px 5px", borderRadius: 999, background: roomModalSubTab === "ACTIVE" ? "rgba(0,0,0,0.2)" : "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                            {roomActiveReclamations.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("MOST_REPORTED")}
                        style={{
                          padding: "8px 6px",
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
                          gap: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>💥 Trends</span>
                        <span style={{ padding: "1px 5px", borderRadius: 999, background: roomModalSubTab === "MOST_REPORTED" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)", color: roomModalSubTab === "MOST_REPORTED" ? "#000" : "#cbd5e1", fontSize: 10, fontWeight: 800 }}>
                          {roomProblemStats.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("HISTORY")}
                        style={{
                          padding: "8px 6px",
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
                          gap: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>📜 History</span>
                        <span style={{ padding: "1px 5px", borderRadius: 999, background: roomModalSubTab === "HISTORY" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)", color: roomModalSubTab === "HISTORY" ? "#000" : "#cbd5e1", fontSize: 10, fontWeight: 800 }}>
                          {roomModalReclamations.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("TIMELINE")}
                        style={{
                          padding: "8px 6px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "TIMELINE" ? "#10b981" : "transparent",
                          color: roomModalSubTab === "TIMELINE" ? "#000000" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>📅 Timeline</span>
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
                                {rec.created_at && (
                                  <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                    <span>🕒 Logged: {formatIncidentDate(rec.created_at).full}</span>
                                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>{formatIncidentDate(rec.created_at).relative}</span>
                                  </div>
                                )}
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

                    {/* SUB-CATEGORY 3: FULL HISTORY WITH INLINE PAST LOG BACKFILL */}
                    {roomModalSubTab === "HISTORY" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <h4 style={{ margin: 0, fontSize: 14, color: "#e879f9", fontWeight: 800 }}>
                            📜 Room {selectedRoomModal.room_number} Ticket History ({roomModalReclamations.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowInModalPastLog(!showInModalPastLog)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              background: showInModalPastLog ? "rgba(239, 68, 68, 0.2)" : "rgba(232, 121, 249, 0.2)",
                              border: `1px solid ${showInModalPastLog ? "#ef4444" : "#e879f9"}`,
                              color: showInModalPastLog ? "#f87171" : "#e879f9",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {showInModalPastLog ? "✕ Cancel Backfill" : "➕ Log Past Incident"}
                          </button>
                        </div>

                        {/* INLINE HISTORICAL BACKFILL FORM */}
                        {showInModalPastLog && (
                          <form
                            onSubmit={handleInModalHistoricalSubmit}
                            style={{
                              background: "rgba(232, 121, 249, 0.08)",
                              padding: 12,
                              borderRadius: 12,
                              border: "1px dashed rgba(232, 121, 249, 0.4)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#e879f9" }}>
                              📝 Backfill Past Incident for Room {selectedRoomModal.room_number}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#cbd5e1", marginBottom: 3 }}>
                                  Incident Date & Time
                                </label>
                                <input
                                  type="datetime-local"
                                  required
                                  value={inModalHistDate}
                                  onChange={(e) => setInModalHistDate(e.target.value)}
                                  style={{ width: "100%", padding: 6, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 11 }}
                                />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#cbd5e1", marginBottom: 3 }}>
                                  Status
                                </label>
                                <select
                                  value={inModalHistStatus}
                                  onChange={(e) => setInModalHistStatus(e.target.value as any)}
                                  style={{ width: "100%", padding: 6, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 11 }}
                                >
                                  <option value="RESOLVED">RESOLVED (Past Solved)</option>
                                  <option value="OPEN">OPEN (Needs Attention)</option>
                                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#cbd5e1", marginBottom: 3 }}>
                                  Department
                                </label>
                                <select
                                  value={inModalHistDept}
                                  onChange={(e) => {
                                    setInModalHistDept(e.target.value);
                                    const presets = PRESET_ISSUES[e.target.value];
                                    if (presets && presets.length > 0) {
                                      setInModalHistCategory(presets[0].category);
                                    }
                                  }}
                                  style={{ width: "100%", padding: 6, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 11 }}
                                >
                                  {allDepartments.map((d) => (
                                    <option key={d.code} value={d.code}>{d.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#cbd5e1", marginBottom: 3 }}>
                                  Category
                                </label>
                                <select
                                  value={inModalHistCategory}
                                  onChange={(e) => setInModalHistCategory(e.target.value)}
                                  style={{ width: "100%", padding: 6, borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 11 }}
                                >
                                  {(PRESET_ISSUES[inModalHistDept] || DEFAULT_PRESETS).map((p) => (
                                    <option key={p.category} value={p.category}>{p.category}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#cbd5e1", marginBottom: 3 }}>
                                Description / Notes
                              </label>
                              <input
                                type="text"
                                placeholder="What happened and how was it addressed..."
                                value={inModalHistDesc}
                                onChange={(e) => setInModalHistDesc(e.target.value)}
                                style={{ width: "100%", padding: "7px 8px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 11 }}
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isPending}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "#e879f9",
                                border: "none",
                                color: "#000",
                                fontWeight: 800,
                                cursor: "pointer",
                                fontSize: 11,
                              }}
                            >
                              💾 Save Past Log to History &rarr;
                            </button>
                          </form>
                        )}

                        {roomModalReclamations.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            No past or historical tickets logged for Room {selectedRoomModal.room_number}.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                            {roomModalReclamations.map((rec) => {
                              const dateInfo = formatIncidentDate(rec.created_at);
                              return (
                                <div key={rec.id} style={{ background: "rgba(30, 41, 59, 0.5)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                                      <span>#{rec.id} • {rec.category}</span>
                                      <span style={{ color: "#e879f9", fontWeight: 600, fontSize: 11 }}>({rec.department})</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>{rec.description}</div>
                                    {rec.created_at && (
                                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>📅 {dateInfo.full}</span>
                                        <span style={{ padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>{dateInfo.relative}</span>
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "RESOLVED" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: rec.status === "RESOLVED" ? "#4ade80" : "#f87171", fontWeight: 800, whiteSpace: "nowrap" }}>
                                    {rec.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-CATEGORY 4: CHRONOLOGICAL DATE TIMELINE */}
                    {roomModalSubTab === "TIMELINE" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h4 style={{ margin: 0, fontSize: 14, color: "#10b981", fontWeight: 800 }}>
                            📅 Chronological Event Timeline (Room {selectedRoomModal.room_number})
                          </h4>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {roomModalReclamations.length} recorded events
                          </span>
                        </div>

                        {roomModalReclamations.length === 0 ? (
                          <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            No events in timeline for Room {selectedRoomModal.room_number}.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", paddingLeft: 20, maxHeight: 360, overflowY: "auto" }}>
                            {/* Vertical connector guide line */}
                            <div style={{ position: "absolute", left: 7, top: 10, bottom: 10, width: 2, background: "rgba(16, 185, 129, 0.25)" }} />

                            {[...roomModalReclamations]
                              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                              .map((rec) => {
                                const dateInfo = formatIncidentDate(rec.created_at);
                                const isResolved = rec.status === "RESOLVED";
                                return (
                                  <div key={rec.id} style={{ position: "relative", paddingBottom: 16 }}>
                                    {/* Timeline Node Icon */}
                                    <div
                                      style={{
                                        position: "absolute",
                                        left: -20,
                                        top: 3,
                                        width: 16,
                                        height: 16,
                                        borderRadius: "50%",
                                        background: isResolved ? "#10b981" : "#f59e0b",
                                        border: "2px solid #0f172a",
                                        boxShadow: isResolved ? "0 0 8px rgba(16, 185, 129, 0.5)" : "0 0 8px rgba(245, 158, 11, 0.5)",
                                      }}
                                    />

                                    <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ fontWeight: 800, color: "#fff", fontSize: 12 }}>{rec.category}</span>
                                          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.2)", color: "#34d399", fontWeight: 700 }}>
                                            {rec.department}
                                          </span>
                                        </div>
                                        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
                                          {dateInfo.relative}
                                        </span>
                                      </div>

                                      <div style={{ fontSize: 11, color: "#cbd5e1" }}>{rec.description}</div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 10, color: "#94a3b8" }}>
                                        <span>📅 {dateInfo.full}</span>
                                        <span style={{ fontWeight: 800, color: isResolved ? "#34d399" : "#fbbf24" }}>
                                          {rec.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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

      {/* HISTORICAL RECLAMATION MODAL (GLOBAL) */}
      {showHistoryModal && (
        <div className="portal-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div className="portal-modal-content ses-card" style={{ maxWidth: 520, width: "100%", padding: "1.5rem", borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "#fbbf24", fontWeight: 800 }}>➕ Add Historical Incident Log</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>Backfill past room reclamations with exact dates</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleHistoricalSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: "var(--text-secondary)" }}>
                    Room Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 204"
                    value={histRoom}
                    onChange={(e) => setHistRoom(e.target.value)}
                    className="ses-input"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: "var(--text-secondary)" }}>
                    Incident Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                    className="ses-input"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: "var(--text-secondary)" }}>
                    Department
                  </label>
                  <select
                    value={histDept}
                    onChange={(e) => {
                      setHistDept(e.target.value);
                      const presets = PRESET_ISSUES[e.target.value];
                      if (presets && presets.length > 0) {
                        setHistCategory(presets[0].category);
                      }
                    }}
                    className="ses-select"
                  >
                    {allDepartments.map((d) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: "var(--text-secondary)" }}>
                    Category
                  </label>
                  <select
                    value={histCategory}
                    onChange={(e) => setHistCategory(e.target.value)}
                    className="ses-select"
                  >
                    {(PRESET_ISSUES[histDept] || DEFAULT_PRESETS).map((p) => (
                      <option key={p.category} value={p.category}>{p.category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: "var(--text-secondary)" }}>
                  Status
                </label>
                <select
                  value={histStatus}
                  onChange={(e) => setHistStatus(e.target.value as any)}
                  className="ses-select"
                >
                  <option value="RESOLVED">RESOLVED (Past resolved ticket)</option>
                  <option value="OPEN">OPEN (Unresolved historical issue)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Currently being handled)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: "var(--text-secondary)" }}>
                  Incident Description
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Details of the incident, guest report, and resolution notes..."
                  value={histDesc}
                  onChange={(e) => setHistDesc(e.target.value)}
                  className="ses-input"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: "#f59e0b",
                  border: "none",
                  color: "#000",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {isPending ? "Saving Entry..." : "💾 Save Historical Entry &rarr;"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* FLOATING ACTION BUTTON FOR RAPID DISPATCH */}
      <FAB
        onClick={() => setShowNewTicketSheet(true)}
        label="Quick Incident Dispatch"
      />

      {/* RAPID INCIDENT DISPATCH BOTTOM SHEET */}
      <BottomSheet
        isOpen={showNewTicketSheet}
        onClose={() => setShowNewTicketSheet(false)}
        title="Quick Incident Dispatch"
        subtitle="Log and route guest service requests immediately"
      >
        <form onSubmit={handleQuickTicketSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
              Room Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 101, 204..."
              value={quickRoom}
              onChange={(e) => setQuickRoom(e.target.value)}
              className="ses-input"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                Department
              </label>
              <select
                value={quickDept}
                onChange={(e) => {
                  setQuickDept(e.target.value);
                  const presets = PRESET_ISSUES[e.target.value];
                  if (presets && presets.length > 0) {
                    setQuickCategory(presets[0].category);
                  }
                }}
                className="ses-select"
              >
                <option value="TECHNICAL">Technical / Maintenance</option>
                <option value="HOUSEKEEPING">Housekeeping</option>
                <option value="FOOD_AND_BEVERAGE">Food & Beverage</option>
                <option value="CONCIERGE">Concierge & Front Desk</option>
                <option value="SECURITY">Security & Safety</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                Category
              </label>
              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                className="ses-select"
              >
                {(PRESET_ISSUES[quickDept] || DEFAULT_PRESETS).map((p) => (
                  <option key={p.category} value={p.category}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
              Priority Level
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(["STANDARD", "HIGH", "EMERGENCY"] as const).map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => setQuickPriority(pr)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid",
                    borderColor: quickPriority === pr ? "var(--accent-amber)" : "var(--border-subtle)",
                    background: quickPriority === pr ? "var(--accent-amber-bg)" : "var(--surface-2)",
                    color: quickPriority === pr ? "var(--accent-amber)" : "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
              Incident Details
            </label>
            <textarea
              rows={3}
              placeholder="Describe guest request or observation..."
              value={quickDesc}
              onChange={(e) => setQuickDesc(e.target.value)}
              className="ses-textarea"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary"
            style={{
              padding: "11px",
              borderRadius: "var(--radius-md)",
              background: "var(--accent-amber)",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              marginTop: 6,
            }}
          >
            {isPending ? "Dispatching..." : "Dispatch Incident Now"}
          </button>
        </form>
      </BottomSheet>
    </AppShell>
  );
}
