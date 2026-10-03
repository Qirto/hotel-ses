"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Staff, Department, Reclamation, HotelRoom } from "@/utils/roomsData";
import {
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  toggleStaffShift,
  markStaffAbsentAndRedistribute,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateRoomStayState,
  cycleRoomCleaning,
  createRapidReclamation,
  createHistoricalReclamation,
  logoutRole,
} from "@/app/actions";
import AppShell from "@/app/components/AppShell";
import { NavTabItem } from "@/app/components/BottomNav";

interface Props {
  staffList: Staff[];
  departmentsList?: Department[];
  reclamationsList?: Reclamation[];
  rooms?: HotelRoom[];
  isLiveSupabase?: boolean;
}

export const DEFAULT_HOTEL_DEPARTMENTS: Department[] = [
  { id: 1, code: "RECEPTION", name: "Reception & Front Desk", icon: "🛎️", description: "Guest check-in/out, switchboard, inquiries and concierge dispatches", head_of_department: "Sophie Mercier" },
  { id: 2, code: "HOUSEKEEPING", name: "Housekeeping & Gouvernante", icon: "🧹", description: "Room cleaning, linen management, amenity restocking and floor inspections", head_of_department: "Martine Aubry" },
  { id: 3, code: "TECHNICAL", name: "Technical & Maintenance", icon: "🔧", description: "Plumbing, electrical, HVAC, fixtures and preventive facilities maintenance", head_of_department: "Pierre Dubois" },
  { id: 4, code: "FOOD_AND_BEVERAGE", name: "Food & Beverage (F&B)", icon: "🍽️", description: "Kitchen, restaurants, banquets, room service and bars", head_of_department: "Chef Antoine Girard" },
  { id: 5, code: "MANAGEMENT", name: "Executive & General Management", icon: "👔", description: "Hotel operations oversight, executive decisions, VIP relations and strategy", head_of_department: "Jean-Paul Bonnet" },
  { id: 6, code: "SECURITY", name: "Security & Safety", icon: "🛡️", description: "Premises surveillance, access control, keycards, guest safety and emergency protocols", head_of_department: "Marc Lambert" },
  { id: 7, code: "CONCIERGE", name: "Concierge & Guest Relations", icon: "🚗", description: "Valet parking, luggage handling, excursions, transport and VIP guest assistance", head_of_department: "Lucie Moreau" },
  { id: 8, code: "SPA_AND_WELLNESS", name: "Spa, Wellness & Fitness", icon: "🧖", description: "Massage treatments, thermal baths, sauna, gym and wellness therapies", head_of_department: "Camille Roux" },
  { id: 9, code: "SALES_AND_MARKETING", name: "Sales, Marketing & Events", icon: "📈", description: "Group bookings, corporate events, weddings, digital marketing and PR", head_of_department: "Helene Fontaine" },
  { id: 10, code: "FINANCE_AND_ACCOUNTING", name: "Finance, Accounting & Audit", icon: "💳", description: "Night audit, billing, purchasing, payroll and revenue management", head_of_department: "Bernard Leroy" },
  { id: 11, code: "HUMAN_RESOURCES", name: "Human Resources (HR)", icon: "👥", description: "Recruitment, employee onboarding, scheduling, payroll and training", head_of_department: "Claire Delacroix" },
];

export const STANDARD_ROLES = [
  "manager",
  "receptionist",
  "maintenance",
  "governance",
  "chef",
  "cook",
  "waiter",
  "bartender",
  "concierge",
  "security_officer",
  "spa_therapist",
  "housekeeper",
  "bellboy",
  "accountant",
  "hr_specialist",
  "master",
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type ShiftType = "MORNING" | "EVENING" | "NIGHT" | "OFF";

const SHIFT_LABELS: Record<ShiftType, { label: string; time: string; color: string; bg: string }> = {
  MORNING: { label: "🌅 Morning", time: "07:00 - 15:00", color: "var(--status-cyan)", bg: "var(--status-cyan-bg)" },
  EVENING: { label: "🌇 Evening", time: "15:00 - 23:00", color: "var(--accent-amber)", bg: "var(--accent-amber-bg)" },
  NIGHT: { label: "🌃 Night", time: "23:00 - 07:00", color: "var(--status-purple)", bg: "var(--status-purple-bg)" },
  OFF: { label: "🏖️ Off / Rest", time: "Rest Day", color: "var(--text-muted)", bg: "var(--surface-2)" },
};

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

export default function HrPortal({
  staffList,
  departmentsList = [],
  reclamationsList = [],
  rooms = [],
  isLiveSupabase = false,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ROOMS" | "RECLAMATIONS" | "STATS" | "EMPLOYEES">("EMPLOYEES");
  const [empSubTab, setEmpSubTab] = useState<"DIRECTORY" | "SHIFTS">("DIRECTORY");
  const [rosterDeptFilter, setRosterDeptFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reactive Reclamations Store for instant updates across tabs, rooms & badges
  const [localReclamations, setLocalReclamations] = useState<Reclamation[]>(reclamationsList);
  useEffect(() => {
    setLocalReclamations(reclamationsList);
  }, [reclamationsList]);

  // Real-time synchronization
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-hr")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => {
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

  // Room Pop-up Modal State
  const [selectedRoomModal, setSelectedRoomModal] = useState<HotelRoom | null>(null);
  const [modalTab, setModalTab] = useState<"RECLAMATIONS" | "ROOM_STAT">("ROOM_STAT");
  const [roomModalSubTab, setRoomModalSubTab] = useState<"ACTIVE" | "MOST_REPORTED" | "HISTORY" | "TIMELINE">("ACTIVE");
  const [modalDept, setModalDept] = useState<string>("TECHNICAL");
  const [modalDesc, setModalDesc] = useState<string>("");

  // In-Modal Past Log Backfill State
  const [showInModalPastLog, setShowInModalPastLog] = useState(false);
  const [inModalHistDate, setInModalHistDate] = useState<string>(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [inModalHistDept, setInModalHistDept] = useState<string>("TECHNICAL");
  const [inModalHistCategory, setInModalHistCategory] = useState<string>("A/C & Climate");
  const [inModalHistDesc, setInModalHistDesc] = useState<string>("");
  const [inModalHistStatus, setInModalHistStatus] = useState<"OPEN" | "IN_PROGRESS" | "RESOLVED">("RESOLVED");

  // Shift Planning Roster State
  const [shiftRoster, setShiftRoster] = useState<Record<number, Record<string, ShiftType>>>(() => {
    const initial: Record<number, Record<string, ShiftType>> = {};
    staffList.forEach((s, index) => {
      initial[s.id] = {};
      WEEKDAYS.forEach((day, dIdx) => {
        if ((index + dIdx) % 7 === 0 || (index + dIdx) % 7 === 6) {
          initial[s.id][day] = "OFF";
        } else if (s.role === "receptionist" || s.role === "housekeeper") {
          initial[s.id][day] = dIdx % 2 === 0 ? "MORNING" : "EVENING";
        } else if (s.role === "security_officer" || s.role === "maintenance") {
          initial[s.id][day] = dIdx % 3 === 0 ? "NIGHT" : "MORNING";
        } else {
          initial[s.id][day] = "MORNING";
        }
      });
    });
    return initial;
  });

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<string>("receptionist");
  const [newDept, setNewDept] = useState<string>("RECEPTION");
  const [newPhone, setNewPhone] = useState("");

  // Filters
  const [recDeptFilter, setRecDeptFilter] = useState<string>("ALL");
  const [recStatusFilter, setRecStatusFilter] = useState<string>("ALL");
  const [recDateFilter, setRecDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH" | "ARCHIVE">("ALL");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFloorFilter, setRoomFloorFilter] = useState<number | "ALL">("ALL");

  // Departments List
  const activeDepartments = useMemo(() => {
    const map = new Map<string, Department>();
    DEFAULT_HOTEL_DEPARTMENTS.forEach((d) => map.set(d.code, d));
    departmentsList.forEach((d) => map.set(d.code, d));
    return Array.from(map.values());
  }, [departmentsList]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (selectedDept !== "ALL" && s.department !== selectedDept) return false;
      if (
        search.trim() &&
        !s.full_name.toLowerCase().includes(search.trim().toLowerCase()) &&
        !s.role.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [staffList, selectedDept, search]);

  // Filtered Reclamations (using reactive localReclamations + recDateFilter)
  const filteredReclamations = useMemo(() => {
    const now = new Date();
    return localReclamations.filter((r) => {
      if (recDeptFilter !== "ALL" && r.department !== recDeptFilter) return false;
      if (recStatusFilter !== "ALL" && r.status !== recStatusFilter) return false;

      if (recDateFilter !== "ALL" && r.created_at) {
        const ticketDate = new Date(r.created_at);
        const diffMs = now.getTime() - ticketDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (recDateFilter === "TODAY" && diffDays > 1) return false;
        if (recDateFilter === "WEEK" && diffDays > 7) return false;
        if (recDateFilter === "MONTH" && diffDays > 30) return false;
        if (recDateFilter === "ARCHIVE" && diffDays <= 30) return false;
      }
      return true;
    });
  }, [localReclamations, recDeptFilter, recStatusFilter, recDateFilter]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomSearch && !r.room_number.includes(roomSearch)) return false;
      if (roomFloorFilter !== "ALL" && r.floor !== roomFloorFilter) return false;
      return true;
    });
  }, [rooms, roomSearch, roomFloorFilter]);

  // Room Modal Reclamations (instantly reflects localReclamations additions)
  const roomModalReclamations = useMemo(() => {
    if (!selectedRoomModal) return [];
    return localReclamations.filter(
      (r) => r.room_id === selectedRoomModal.id || r.room?.room_number === selectedRoomModal.room_number
    );
  }, [localReclamations, selectedRoomModal]);

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

  // Staff Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;

    startTransition(async () => {
      const res = await createStaffMember({
        full_name: newFullName.trim(),
        role: newRole,
        department: newDept,
        phone_number: newPhone.trim() || undefined,
        shift_status: "ON_SHIFT",
      });

      if (res.success) {
        setMessage(`✅ Created employee "${newFullName}" successfully!`);
        setShowCreateModal(false);
        setNewFullName("");
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleToggleShift = (member: Staff) => {
    startTransition(async () => {
      await toggleStaffShift(member.id, member.shift_status);
      setMessage(`🔄 Shift status updated for ${member.full_name}.`);
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleMarkAbsent = (member: Staff) => {
    if (confirm(`Mark ${member.full_name} as ABSENT today and reassign open tickets?`)) {
      startTransition(async () => {
        await markStaffAbsentAndRedistribute(member.id);
        setMessage(`🚨 Marked ${member.full_name} as Absent. Reassigned tasks.`);
        setTimeout(() => setMessage(null), 4000);
      });
    }
  };

  const handleShiftChange = (staffId: number, day: string, newShift: ShiftType) => {
    setShiftRoster((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), [day]: newShift },
    }));
  };

  // Stay State Handler
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
        setMessage(`🧹 Room ${room.room_number} cleaning set to ${nextStatus}!`);
        if (selectedRoomModal && selectedRoomModal.id === room.id) {
          setSelectedRoomModal((prev) => (prev ? { ...prev, cleaning_status: nextStatus } : null));
        }
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Create Rapid Reclamation in Room Modal
  const handleModalCreateReclamation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomModal) return;

    const optimisticTicket: Reclamation = {
      id: Date.now(),
      room_id: selectedRoomModal.id,
      room: selectedRoomModal,
      department: modalDept,
      category: "General",
      description: modalDesc.trim() || `HR Ticket for Room ${selectedRoomModal.room_number}`,
      priority: "STANDARD",
      status: "OPEN",
      created_at: new Date().toISOString(),
    };
    setLocalReclamations((prev) => [optimisticTicket, ...prev]);

    startTransition(async () => {
      const res = await createRapidReclamation({
        roomId: selectedRoomModal.id,
        department: modalDept,
        category: "General",
        description: modalDesc.trim() || `HR Ticket for Room ${selectedRoomModal.room_number}`,
      });

      if (res.success) {
        setMessage(`✅ Ticket created for Room ${selectedRoomModal.room_number}!`);
        setModalDesc("");
        setTimeout(() => setMessage(null), 3000);
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

  const handleDeleteStaff = (id: number, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the staff directory?`)) {
      startTransition(async () => {
        const res = await deleteStaffMember(id);
        if (res.success) {
          setMessage(`🗑️ Removed ${name} from staff directory.`);
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage(`❌ Error removing staff member.`);
        }
      });
    }
  };

  // Filtered Roster Staff
  const filteredRosterStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (rosterDeptFilter !== "ALL" && s.department !== rosterDeptFilter) return false;
      return true;
    });
  }, [staffList, rosterDeptFilter]);

  // Shift Roster Aggregations
  const rosterStats = useMemo(() => {
    let morning = 0;
    let evening = 0;
    let night = 0;
    let off = 0;
    Object.values(shiftRoster).forEach((memberDays) => {
      Object.values(memberDays).forEach((shift) => {
        if (shift === "MORNING") morning++;
        else if (shift === "EVENING") evening++;
        else if (shift === "NIGHT") night++;
        else if (shift === "OFF") off++;
      });
    });
    return { morning, evening, night, off };
  }, [shiftRoster]);

  // Stats Data
  const totalStaff = staffList.length;
  const onShiftCount = staffList.filter((s) => s.shift_status === "ON_SHIFT").length;

  const deptStaffCounts: Record<string, number> = {};
  staffList.forEach((s) => {
    const dept = s.department || "RECEPTION";
    deptStaffCounts[dept] = (deptStaffCounts[dept] || 0) + 1;
  });

  const navItems: NavTabItem[] = [
    {
      id: "EMPLOYEES",
      label: "Staff & Shifts",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      badge: totalStaff,
      isActive: activeTab === "EMPLOYEES",
      onClick: () => setActiveTab("EMPLOYEES"),
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
      badge: rooms.length,
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
      badge: localReclamations.length > 0 ? localReclamations.length : undefined,
      isActive: activeTab === "RECLAMATIONS",
      onClick: () => setActiveTab("RECLAMATIONS"),
    },
    {
      id: "STATS",
      label: "Analytics",
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
      departmentName="Human Resources & Roster"
      departmentCode="HR"
      departmentColor="var(--status-emerald)"
      onSignOut={() => {
        startTransition(async () => {
          await logoutRole();
          window.location.href = "/login";
        });
      }}
      headerActions={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            background: "var(--status-emerald)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>+ Add Staff</span>
        </button>
      }
    >
      {message && (
        <div style={{ marginBottom: "1rem", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--status-emerald-bg)", border: "1px solid var(--status-emerald)", color: "var(--status-emerald)", fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
      )}

        {/* TAB: EMPLOYEES & SHIFTS WITH SUB-CATEGORIES */}
        {activeTab === "EMPLOYEES" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* SUB-CATEGORY SWITCHER BAR */}
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "6px 8px",
                background: "var(--surface-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-subtle)",
                width: "fit-content",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <button
                onClick={() => setEmpSubTab("DIRECTORY")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: empSubTab === "DIRECTORY" ? "linear-gradient(135deg, #059669, #34d399)" : "transparent",
                  color: empSubTab === "DIRECTORY" ? "#000000" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease-in-out",
                  boxShadow: empSubTab === "DIRECTORY" ? "0 4px 12px rgba(52, 211, 153, 0.3)" : "none",
                }}
              >
                <span>👥 1. Employees Directory</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: empSubTab === "DIRECTORY" ? "rgba(0,0,0,0.15)" : "var(--surface-2)",
                    color: empSubTab === "DIRECTORY" ? "#000" : "var(--text-primary)",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {filteredStaff.length}
                </span>
              </button>

              <button
                onClick={() => setEmpSubTab("SHIFTS")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: empSubTab === "SHIFTS" ? "linear-gradient(135deg, #0284c7, #38bdf8)" : "transparent",
                  color: empSubTab === "SHIFTS" ? "#000000" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease-in-out",
                  boxShadow: empSubTab === "SHIFTS" ? "0 4px 12px rgba(56, 189, 248, 0.3)" : "none",
                }}
              >
                <span>🗓️ 2. Weekly Shift Roster & Schedules</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: empSubTab === "SHIFTS" ? "rgba(0,0,0,0.15)" : "var(--surface-2)",
                    color: empSubTab === "SHIFTS" ? "#000" : "var(--text-primary)",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  7 Days
                </span>
              </button>
            </div>

            {/* SUB-CATEGORY 1: EMPLOYEES DIRECTORY */}
            {empSubTab === "DIRECTORY" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* SUMMARY CARDS BAR */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Total Staff Members</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--status-emerald)", marginTop: 2 }}>{totalStaff}</div>
                  </div>
                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Active On Shift</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--status-cyan)", marginTop: 2 }}>{onShiftCount}</div>
                  </div>
                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Off Shift / Standby</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-amber)", marginTop: 2 }}>{totalStaff - onShiftCount}</div>
                  </div>
                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Departments Managed</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--status-purple)", marginTop: 2 }}>{activeDepartments.length}</div>
                  </div>
                </div>

                {/* DIRECTORY CONTROLS & TABLE */}
                <div className="ses-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--status-emerald)" }}>
                        👥 Employees Master Directory
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                        Manage staff profiles, department assignments, and live shift status
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        type="text"
                        placeholder="Search staff name or role..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ padding: "8px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 12, width: 220 }}
                      />

                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                      >
                        <option value="ALL">All Departments ({totalStaff})</option>
                        {activeDepartments.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.icon} {d.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setShowCreateModal(true)}
                        style={{ padding: "8px 16px", borderRadius: "var(--radius-md)", background: "var(--status-emerald)", border: "none", color: "#ffffff", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px var(--accent-amber-glow)" }}
                      >
                        ➕ Add New Employee
                      </button>
                    </div>
                  </div>

                  {/* Desktop Table View (>= 768px) */}
                  <div className="responsive-table-view">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                          <th style={{ padding: "12px 10px" }}>Employee Name</th>
                          <th style={{ padding: "12px 10px" }}>Role</th>
                          <th style={{ padding: "12px 10px" }}>Department</th>
                          <th style={{ padding: "12px 10px" }}>Phone / Contact</th>
                          <th style={{ padding: "12px 10px" }}>Shift Status</th>
                          <th style={{ padding: "12px 10px", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                              No staff members found matching search & department filters.
                            </td>
                          </tr>
                        ) : (
                          filteredStaff.map((member) => (
                            <tr key={member.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "12px 10px", fontWeight: 700, color: "var(--text-primary)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 16 }}>👤</span>
                                  <span>{member.full_name}</span>
                                </div>
                              </td>
                              <td style={{ padding: "12px 10px", color: "var(--status-cyan)", fontWeight: 600 }}>{member.role}</td>
                              <td style={{ padding: "12px 10px" }}>
                                <span style={{ padding: "3px 8px", borderRadius: 6, background: "var(--status-purple-bg)", border: "1px solid var(--border-subtle)", color: "var(--status-purple)", fontSize: 11, fontWeight: 700 }}>
                                  {member.department || "RECEPTION"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 10px", color: "var(--text-secondary)", fontSize: 12 }}>
                                {member.phone_number || "📞 Unlisted"}
                              </td>
                              <td style={{ padding: "12px 10px" }}>
                                <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: member.shift_status === "ON_SHIFT" ? "var(--status-emerald-bg)" : "var(--surface-2)", color: member.shift_status === "ON_SHIFT" ? "var(--status-emerald)" : "var(--text-muted)", border: `1px solid ${member.shift_status === "ON_SHIFT" ? "var(--status-emerald)" : "var(--border-subtle)"}` }}>
                                  {member.shift_status === "ON_SHIFT" ? "🟢 ON SHIFT" : "⚪ OFF SHIFT"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 10px", textAlign: "right" }}>
                                <button
                                  onClick={() => handleToggleShift(member)}
                                  style={{ padding: "5px 10px", borderRadius: 6, background: "var(--status-cyan-bg)", border: "1px solid var(--status-cyan)", color: "var(--status-cyan)", fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6 }}
                                >
                                  ⚡ Toggle Shift
                                </button>
                                <button
                                  onClick={() => handleMarkAbsent(member)}
                                  style={{ padding: "5px 10px", borderRadius: 6, background: "var(--status-amber-bg)", border: "1px solid var(--status-amber)", color: "var(--status-amber)", fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6 }}
                                >
                                  🚨 Absent
                                </button>
                                <button
                                  onClick={() => handleDeleteStaff(member.id, member.full_name)}
                                  style={{ padding: "5px 10px", borderRadius: 6, background: "var(--status-rose-bg)", border: "1px solid var(--status-rose)", color: "var(--status-rose)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Cards View (< 768px) - NO horizontal scroll */}
                  <div className="responsive-cards-view">
                    {filteredStaff.length === 0 ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No staff members found matching search & department filters.
                      </div>
                    ) : (
                      filteredStaff.map((member) => (
                        <div key={member.id} className="mobile-staff-card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18 }}>👤</span>
                              <div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                                  {member.full_name}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--status-cyan)", fontWeight: 700 }}>
                                  {member.role}
                                </div>
                              </div>
                            </div>

                            <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: member.shift_status === "ON_SHIFT" ? "var(--status-emerald-bg)" : "var(--surface-2)", color: member.shift_status === "ON_SHIFT" ? "var(--status-emerald)" : "var(--text-muted)", border: `1px solid ${member.shift_status === "ON_SHIFT" ? "var(--status-emerald)" : "var(--border-subtle)"}` }}>
                              {member.shift_status === "ON_SHIFT" ? "🟢 ON SHIFT" : "⚪ OFF SHIFT"}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "8px 0", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                            <span style={{ padding: "3px 8px", borderRadius: "var(--radius-sm)", background: "var(--status-purple-bg)", border: "1px solid var(--border-subtle)", color: "var(--status-purple)", fontSize: 11, fontWeight: 700 }}>
                              🏢 {member.department || "RECEPTION"}
                            </span>
                            <a
                              href={member.phone_number ? `tel:${member.phone_number}` : undefined}
                              style={{ color: "var(--text-secondary)", fontSize: 12, textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                            >
                              📞 {member.phone_number || "Unlisted Contact"}
                            </a>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                            <button
                              onClick={() => handleToggleShift(member)}
                              style={{ padding: "8px", borderRadius: "var(--radius-sm)", background: "var(--status-cyan-bg)", border: "1px solid var(--status-cyan)", color: "var(--status-cyan)", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                            >
                              ⚡ Shift
                            </button>
                            <button
                              onClick={() => handleMarkAbsent(member)}
                              style={{ padding: "8px", borderRadius: "var(--radius-sm)", background: "var(--status-amber-bg)", border: "1px solid var(--status-amber)", color: "var(--status-amber)", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                            >
                              🚨 Absent
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(member.id, member.full_name)}
                              style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--status-rose-bg)", border: "1px solid var(--status-rose)", color: "var(--status-rose)", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              aria-label="Delete Staff"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 2: SHIFT SCHEDULING & ROSTER */}
            {empSubTab === "SHIFTS" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* SHIFT SUMMARY CARDS */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--status-cyan)", fontWeight: 700 }}>🌅 Morning Shifts</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{rosterStats.morning} slots</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>07:00 - 15:00</div>
                  </div>

                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--accent-amber)", fontWeight: 700 }}>🌇 Evening Shifts</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{rosterStats.evening} slots</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>15:00 - 23:00</div>
                  </div>

                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--status-purple)", fontWeight: 700 }}>🌃 Night Shifts</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{rosterStats.night} slots</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>23:00 - 07:00</div>
                  </div>

                  <div style={{ background: "var(--surface-card)", padding: "14px", borderRadius: 14, border: "1px solid var(--border-default)", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>🏖️ Rest Days</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{rosterStats.off} days</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Off / Rest</div>
                  </div>
                </div>

                {/* WEEKLY ROSTER MATRIX */}
                <div className="ses-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--status-cyan)" }}>
                        🗓️ Weekly Shift Roster & Planning Matrix
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                        Assign and adjust daily working shifts for all hotel departments across the week
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Filter Roster:</label>
                      <select
                        value={rosterDeptFilter}
                        onChange={(e) => setRosterDeptFilter(e.target.value)}
                        style={{ padding: "6px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                      >
                        <option value="ALL">All Departments</option>
                        {activeDepartments.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.icon} {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Desktop Table View (>= 768px) */}
                  <div className="responsive-table-view">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "center" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                          <th style={{ padding: "12px 10px", textAlign: "left", minWidth: 170 }}>Employee / Role</th>
                          {WEEKDAYS.map((day) => (
                            <th key={day} style={{ padding: "12px 10px", minWidth: 115 }}>
                              <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>{day}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRosterStaff.map((member) => {
                          const memberShifts = shiftRoster[member.id] || {};
                          return (
                            <tr key={member.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "10px", textAlign: "left" }}>
                                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{member.full_name}</div>
                                <div style={{ fontSize: 11, color: "var(--status-emerald)", fontWeight: 600 }}>{member.role}</div>
                                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{member.department}</div>
                              </td>
                              {WEEKDAYS.map((day) => {
                                const currentShift: ShiftType = memberShifts[day] || "MORNING";
                                const shiftInfo = SHIFT_LABELS[currentShift];
                                return (
                                  <td key={day} style={{ padding: "6px" }}>
                                    <select
                                      value={currentShift}
                                      onChange={(e) => handleShiftChange(member.id, day, e.target.value as ShiftType)}
                                      style={{
                                        width: "100%",
                                        padding: "6px 4px",
                                        borderRadius: 8,
                                        background: shiftInfo.bg,
                                        border: `1px solid ${shiftInfo.color}`,
                                        color: shiftInfo.color,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        cursor: "pointer",
                                        textAlign: "center",
                                      }}
                                    >
                                      <option value="MORNING">🌅 Morning (07-15)</option>
                                      <option value="EVENING">🌇 Evening (15-23)</option>
                                      <option value="NIGHT">🌃 Night (23-07)</option>
                                      <option value="OFF">🏖️ Off / Rest</option>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Cards View (< 768px) - NO horizontal scroll */}
                  <div className="responsive-cards-view">
                    {filteredRosterStaff.map((member) => {
                      const memberShifts = shiftRoster[member.id] || {};
                      return (
                        <div key={member.id} className="mobile-roster-card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                                {member.full_name}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--status-emerald)" }}>{member.role}</span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>• {member.department}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", color: "var(--text-secondary)", fontWeight: 700 }}>
                              7-Day Schedule
                            </span>
                          </div>

                          <div className="roster-days-grid">
                            {WEEKDAYS.map((day) => {
                              const currentShift: ShiftType = memberShifts[day] || "MORNING";
                              const shiftInfo = SHIFT_LABELS[currentShift];
                              return (
                                <div key={day} style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--surface-2)", padding: "8px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)" }}>{day.slice(0, 3)}</span>
                                    <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>{shiftInfo.time}</span>
                                  </div>
                                  <select
                                    value={currentShift}
                                    onChange={(e) => handleShiftChange(member.id, day, e.target.value as ShiftType)}
                                    style={{
                                      width: "100%",
                                      padding: "6px 8px",
                                      borderRadius: 6,
                                      background: shiftInfo.bg,
                                      border: `1px solid ${shiftInfo.color}`,
                                      color: shiftInfo.color,
                                      fontSize: 11,
                                      fontWeight: 800,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <option value="MORNING">🌅 Morning</option>
                                    <option value="EVENING">🌇 Evening</option>
                                    <option value="NIGHT">🌃 Night</option>
                                    <option value="OFF">🏖️ Off</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: ROOMS MAP */}
        {activeTab === "ROOMS" && (
          <div className="ses-card">
            <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "var(--status-emerald)" }}>
              🏨 Property Rooms Directory ({filteredRooms.length} rooms)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(160px, 100%), 1fr))", gap: 10, maxHeight: "65vh", overflowY: "auto" }}>
              {filteredRooms.map((room) => {
                const isClean = room.cleaning_status === "CLEAN";
                const isDirty = room.cleaning_status === "DIRTY";
                const roomActiveIncidents = localReclamations.filter(
                  (rec) => (rec.room_id === room.id || rec.room?.room_number === room.room_number) &&
                           (rec.status === "OPEN" || rec.status === "IN_PROGRESS")
                );
                const hasActiveIncident = roomActiveIncidents.length > 0;

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
                        ? "var(--status-rose)"
                        : isDirty
                        ? "var(--accent-amber)"
                        : isClean
                        ? "var(--status-emerald)"
                        : "var(--border-default)",
                      background: "var(--surface-card)",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Room {room.room_number}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {hasActiveIncident && (
                          <span
                            title={`${roomActiveIncidents.length} active issue(s)`}
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--status-rose-bg)",
                              color: "var(--status-rose)",
                              border: "1px solid var(--status-rose)",
                              fontWeight: 800,
                            }}
                          >
                            ⚠️ {roomActiveIncidents.length}
                          </span>
                        )}
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
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Floor {room.floor}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isDirty ? "var(--status-rose)" : isClean ? "var(--status-emerald)" : "var(--status-amber)" }}>
                        {room.cleaning_status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: RECLAMATIONS */}
        {activeTab === "RECLAMATIONS" && (
          <div className="ses-card">
            {/* Sticky Filter Header with Title, Status & Departments Pills + Dropdown */}
            <div className="tab-sticky-filter-bar">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--status-amber)" }}>
                    🛎️ Reclamations Oversight ({filteredReclamations.length})
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    Operational tickets and department dispatches with date filtering.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    value={recStatusFilter}
                    onChange={(e) => setRecStatusFilter(e.target.value)}
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
                    {activeDepartments.map((d) => (
                      <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fixed / Sticky Horizontal Department Pills Row */}
              <div className="filter-pills-row">
                <button
                  type="button"
                  onClick={() => setRecDeptFilter("ALL")}
                  className={`filter-pill-btn ${recDeptFilter === "ALL" ? "active" : ""}`}
                >
                  All ({localReclamations.length})
                </button>
                {activeDepartments.map((d) => {
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

              {/* Date Timeline Filter Tabs */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border-subtle)" }}>
                {[
                  { id: "ALL", label: "All Time" },
                  { id: "TODAY", label: "📅 Today" },
                  { id: "WEEK", label: "🗓️ Last 7 Days" },
                  { id: "MONTH", label: "📆 Last 30 Days" },
                  { id: "ARCHIVE", label: "🗄️ Older Logs" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRecDateFilter(t.id as any)}
                    className={`filter-pill-btn ${recDateFilter === t.id ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "3px 8px" }}
                  >
                    {t.label}
                  </button>
                ))}
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
                    <th style={{ padding: "10px" }}>Date & Time</th>
                    <th style={{ padding: "10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReclamations.map((rec) => {
                    const dateInfo = formatIncidentDate(rec.created_at);
                    return (
                      <tr key={rec.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "var(--accent-amber)" }}>#{rec.id} • Room {rec.room?.room_number || rec.room_id}</td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{rec.department}</td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{rec.category}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.description}</div>
                        </td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)", fontSize: 12 }}>
                          <div>{dateInfo.full}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{dateInfo.relative}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: rec.status === "RESOLVED" ? "var(--status-emerald-bg)" : "var(--status-rose-bg)", color: rec.status === "RESOLVED" ? "var(--status-emerald)" : "var(--status-rose)" }}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (< 768px) - NO horizontal scroll */}
            <div className="responsive-cards-view">
              {filteredReclamations.length === 0 ? (
                <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No incident tickets match the selected filters.
                </div>
              ) : (
                filteredReclamations.map((rec) => {
                  const roomNum = rec.room?.room_number || `Room ${rec.room_id}`;
                  const isResolved = rec.status === "RESOLVED";
                  const dateInfo = formatIncidentDate(rec.created_at);

                  return (
                    <div key={rec.id} className="mobile-ticket-card">
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

                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            background: isResolved ? "var(--status-emerald-bg)" : "var(--status-rose-bg)",
                            color: isResolved ? "var(--status-emerald)" : "var(--status-rose)",
                          }}
                        >
                          {rec.status}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                          {rec.category}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {rec.description}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)", paddingTop: 6, borderTop: "1px dashed var(--border-subtle)" }}>
                        <span>🕒 {dateInfo.full}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)" }}>{dateInfo.relative}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB: STATS (FIXED FOR LIGHT & DARK THEME) */}
        {activeTab === "STATS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <div className="ses-card" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "var(--status-emerald)" }}>
                📊 Staff Headcount per Department
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(deptStaffCounts).map(([dept, count]) => (
                  <div key={dept}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "var(--text-secondary)" }}>
                      <span style={{ fontWeight: 600 }}>{dept}</span>
                      <strong style={{ color: "var(--status-emerald)" }}>{count} employees</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ width: `${Math.round((count / Math.max(...Object.values(deptStaffCounts), 1)) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #059669, #34d399)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* ROOM POP-UP MODAL */}
      {selectedRoomModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content ses-card" style={{ maxWidth: 840, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", padding: 0, borderRadius: "var(--radius-lg)" }}>
            <div style={{ background: "var(--surface-2)", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
                  Room {selectedRoomModal.room_number} Inspection & Operations
                </h3>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Floor {selectedRoomModal.floor} • {selectedRoomModal.block?.replace("_", " ") || "Main Wing"}</span>
              </div>
              <button onClick={() => setSelectedRoomModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* MODAL SIDEBAR */}
              <div style={{ width: 210, background: "var(--surface-2)", borderRight: "1px solid var(--border-subtle)", padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setModalTab("ROOM_STAT")}
                  style={{ padding: "10px", borderRadius: 10, border: "1px solid", borderColor: modalTab === "ROOM_STAT" ? "var(--status-emerald)" : "transparent", background: modalTab === "ROOM_STAT" ? "var(--status-emerald-bg)" : "transparent", color: modalTab === "ROOM_STAT" ? "var(--status-emerald)" : "var(--text-muted)", fontSize: 12, fontWeight: 700, textAlign: "left", cursor: "pointer" }}
                >
                  📊 1. Room Stat
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("RECLAMATIONS")}
                  style={{ padding: "10px", borderRadius: 10, border: "1px solid", borderColor: modalTab === "RECLAMATIONS" ? "var(--status-purple)" : "transparent", background: modalTab === "RECLAMATIONS" ? "var(--status-purple-bg)" : "transparent", color: modalTab === "RECLAMATIONS" ? "var(--status-purple)" : "var(--text-muted)", fontSize: 12, fontWeight: 700, textAlign: "left", cursor: "pointer" }}
                >
                  🛎️ 2. Reclamations ({roomModalReclamations.length})
                </button>
              </div>

              {/* MODAL CONTENT */}
              <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto", background: "var(--surface-card)" }}>
                {modalTab === "ROOM_STAT" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 15, color: "var(--status-emerald)", fontWeight: 800 }}>📊 Room Status & Live Parameters</h4>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Occupancy: <strong>{selectedRoomModal.is_occupied ? "Occupied" : "Vacant"}</strong></div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cleanliness: <strong>{selectedRoomModal.cleaning_status}</strong></div>
                    <button onClick={() => handleCleaningCycle(selectedRoomModal)} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "var(--status-emerald-bg)", border: "1px solid var(--status-emerald)", color: "var(--status-emerald)", fontWeight: 800, cursor: "pointer" }}>
                      🧹 Cycle Cleaning Status &rarr;
                    </button>
                  </div>
                )}

                {/* MODAL TAB 2: RECLAMATIONS WITH 4 SUB-CATEGORIES */}
                {modalTab === "RECLAMATIONS" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* SUB-CATEGORY TAB SWITCHER FOR ROOM RECLAMATIONS */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "4px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("ACTIVE")}
                        style={{
                          padding: "8px 4px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "ACTIVE" ? "var(--status-emerald)" : "transparent",
                          color: roomModalSubTab === "ACTIVE" ? "#000000" : "var(--text-muted)",
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
                          <span style={{ padding: "1px 5px", borderRadius: 999, background: roomModalSubTab === "ACTIVE" ? "rgba(0,0,0,0.2)" : "var(--status-rose)", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                            {roomActiveReclamations.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("MOST_REPORTED")}
                        style={{
                          padding: "8px 4px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "MOST_REPORTED" ? "var(--accent-amber)" : "transparent",
                          color: roomModalSubTab === "MOST_REPORTED" ? "#000000" : "var(--text-muted)",
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
                        <span style={{ padding: "1px 5px", borderRadius: 999, background: roomModalSubTab === "MOST_REPORTED" ? "rgba(0,0,0,0.2)" : "var(--surface-card)", color: roomModalSubTab === "MOST_REPORTED" ? "#000" : "var(--text-secondary)", fontSize: 10, fontWeight: 800 }}>
                          {roomProblemStats.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("HISTORY")}
                        style={{
                          padding: "8px 4px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "HISTORY" ? "var(--status-purple)" : "transparent",
                          color: roomModalSubTab === "HISTORY" ? "#000000" : "var(--text-muted)",
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
                        <span style={{ padding: "1px 5px", borderRadius: 999, background: roomModalSubTab === "HISTORY" ? "rgba(0,0,0,0.2)" : "var(--surface-card)", color: roomModalSubTab === "HISTORY" ? "#000" : "var(--text-secondary)", fontSize: 10, fontWeight: 800 }}>
                          {roomModalReclamations.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoomModalSubTab("TIMELINE")}
                        style={{
                          padding: "8px 4px",
                          borderRadius: 8,
                          border: "none",
                          background: roomModalSubTab === "TIMELINE" ? "var(--status-cyan)" : "transparent",
                          color: roomModalSubTab === "TIMELINE" ? "#000000" : "var(--text-muted)",
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

                    {/* SUB-CATEGORY 1: ACTIVE PROBLEMS */}
                    {roomModalSubTab === "ACTIVE" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "var(--status-emerald)", fontWeight: 800 }}>
                          ⚡ Active Reclamations ({roomActiveReclamations.length})
                        </h4>

                        {roomActiveReclamations.length === 0 ? (
                          <div style={{ padding: "12px", borderRadius: 10, background: "var(--status-emerald-bg)", border: "1px solid var(--status-emerald)", color: "var(--status-emerald)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>✅</span>
                            <span>No active problems recorded for Room {selectedRoomModal.room_number}. Operations normal.</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {roomActiveReclamations.map((rec) => (
                              <div key={rec.id} style={{ background: "var(--surface-2)", padding: "12px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 13 }}>#{rec.id} • {rec.category}</span>
                                    <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--status-emerald-bg)", color: "var(--status-emerald)" }}>{rec.department}</span>
                                  </div>
                                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "OPEN" ? "var(--status-rose-bg)" : "var(--status-amber-bg)", color: rec.status === "OPEN" ? "var(--status-rose)" : "var(--status-amber)", fontWeight: 800, border: "1px solid currentColor" }}>
                                    {rec.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{rec.description}</div>
                                {rec.created_at && (
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                    <span>🕒 Logged: {formatIncidentDate(rec.created_at).full}</span>
                                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--surface-card)" }}>{formatIncidentDate(rec.created_at).relative}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CREATE RAPID RECLAMATION FORM */}
                        <form onSubmit={handleModalCreateReclamation} style={{ background: "var(--surface-2)", padding: "12px", borderRadius: 12, border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--status-emerald)" }}>➕ Log New Rapid Ticket for Room {selectedRoomModal.room_number}</div>
                          <select
                            value={modalDept}
                            onChange={(e) => setModalDept(e.target.value)}
                            className="ses-select"
                          >
                            {DEFAULT_HOTEL_DEPARTMENTS.map((d) => (
                              <option key={d.code} value={d.code}>{d.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Description of issue..."
                            value={modalDesc}
                            onChange={(e) => setModalDesc(e.target.value)}
                            className="ses-input"
                          />
                          <button
                            type="submit"
                            disabled={isPending}
                            style={{ padding: "8px", borderRadius: 8, background: "var(--status-emerald)", border: "none", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 12 }}
                          >
                            Dispatch Reclamation &rarr;
                          </button>
                        </form>
                      </div>
                    )}

                    {/* SUB-CATEGORY 2: MOST REPORTED PROBLEMS */}
                    {roomModalSubTab === "MOST_REPORTED" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: "var(--accent-amber)", fontWeight: 800 }}>
                          💥 Most Reported Problem Categories
                        </h4>

                        {roomProblemStats.length === 0 ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                            No problem patterns recorded for Room {selectedRoomModal.room_number} yet.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {roomProblemStats.map((stat) => (
                              <div key={stat.category} style={{ background: "var(--surface-2)", padding: "12px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div>
                                    <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 13 }}>{stat.category}</span>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>({stat.department})</span>
                                  </div>
                                  <span style={{ fontWeight: 800, color: "var(--accent-amber)", fontSize: 13 }}>{stat.count} Reports</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 999, background: "var(--surface-card)", overflow: "hidden" }}>
                                  <div style={{ width: `${stat.percentage}%`, height: "100%", background: "linear-gradient(90deg, #059669, #34d399)" }} />
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
                          <h4 style={{ margin: 0, fontSize: 14, color: "var(--status-purple)", fontWeight: 800 }}>
                            📜 Room {selectedRoomModal.room_number} History ({roomModalReclamations.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowInModalPastLog(!showInModalPastLog)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              background: showInModalPastLog ? "var(--status-rose-bg)" : "var(--status-purple-bg)",
                              border: `1px solid ${showInModalPastLog ? "var(--status-rose)" : "var(--status-purple)"}`,
                              color: showInModalPastLog ? "var(--status-rose)" : "var(--status-purple)",
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
                              background: "var(--surface-2)",
                              padding: 12,
                              borderRadius: 12,
                              border: "1px dashed var(--status-purple)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--status-purple)" }}>
                              📝 Backfill Past Incident for Room {selectedRoomModal.room_number}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 3 }}>
                                  Incident Date & Time
                                </label>
                                <input
                                  type="datetime-local"
                                  required
                                  value={inModalHistDate}
                                  onChange={(e) => setInModalHistDate(e.target.value)}
                                  className="ses-input"
                                  style={{ padding: 6, fontSize: 11 }}
                                />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 3 }}>
                                  Status
                                </label>
                                <select
                                  value={inModalHistStatus}
                                  onChange={(e) => setInModalHistStatus(e.target.value as any)}
                                  className="ses-select"
                                  style={{ padding: 6, fontSize: 11 }}
                                >
                                  <option value="RESOLVED">RESOLVED (Past Solved)</option>
                                  <option value="OPEN">OPEN (Needs Attention)</option>
                                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 3 }}>
                                  Department
                                </label>
                                <select
                                  value={inModalHistDept}
                                  onChange={(e) => setInModalHistDept(e.target.value)}
                                  className="ses-select"
                                  style={{ padding: 6, fontSize: 11 }}
                                >
                                  {DEFAULT_HOTEL_DEPARTMENTS.map((d) => (
                                    <option key={d.code} value={d.code}>{d.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 3 }}>
                                  Category / Nature
                                </label>
                                <input
                                  type="text"
                                  value={inModalHistCategory}
                                  onChange={(e) => setInModalHistCategory(e.target.value)}
                                  placeholder="e.g. A/C, Plumbing, Keycard..."
                                  className="ses-input"
                                  style={{ padding: 6, fontSize: 11 }}
                                />
                              </div>
                            </div>

                            <div>
                              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 3 }}>
                                Incident Description & Resolution Notes
                              </label>
                              <input
                                type="text"
                                placeholder="Summary of what happened and how it was resolved..."
                                value={inModalHistDesc}
                                onChange={(e) => setInModalHistDesc(e.target.value)}
                                className="ses-input"
                                style={{ padding: "7px 8px", fontSize: 11 }}
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isPending}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "var(--status-purple)",
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
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                            No past or historical tickets logged for Room {selectedRoomModal.room_number}.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                            {roomModalReclamations.map((rec) => {
                              const dateInfo = formatIncidentDate(rec.created_at);
                              return (
                                <div key={rec.id} style={{ background: "var(--surface-2)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                      <span>#{rec.id} • {rec.category}</span>
                                      <span style={{ color: "var(--status-purple)", fontWeight: 600, fontSize: 11 }}>({rec.department})</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{rec.description}</div>
                                    {rec.created_at && (
                                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>📅 {dateInfo.full}</span>
                                        <span style={{ padding: "1px 5px", borderRadius: 4, background: "var(--surface-card)" }}>{dateInfo.relative}</span>
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: rec.status === "RESOLVED" ? "var(--status-emerald-bg)" : "var(--status-rose-bg)", color: rec.status === "RESOLVED" ? "var(--status-emerald)" : "var(--status-rose)", fontWeight: 800, whiteSpace: "nowrap" }}>
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
                          <h4 style={{ margin: 0, fontSize: 14, color: "var(--status-cyan)", fontWeight: 800 }}>
                            📅 Chronological Event Timeline (Room {selectedRoomModal.room_number})
                          </h4>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {roomModalReclamations.length} recorded events
                          </span>
                        </div>

                        {roomModalReclamations.length === 0 ? (
                          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                            No events in timeline for Room {selectedRoomModal.room_number}.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", paddingLeft: 20, maxHeight: 360, overflowY: "auto" }}>
                            {/* Vertical connector line */}
                            <div style={{ position: "absolute", left: 7, top: 10, bottom: 10, width: 2, background: "var(--status-cyan)" }} />

                            {[...roomModalReclamations]
                              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                              .map((rec) => {
                                const dateInfo = formatIncidentDate(rec.created_at);
                                const isResolved = rec.status === "RESOLVED";
                                return (
                                  <div key={rec.id} style={{ position: "relative", paddingBottom: 16 }}>
                                    {/* Timeline Node */}
                                    <div
                                      style={{
                                        position: "absolute",
                                        left: -20,
                                        top: 3,
                                        width: 16,
                                        height: 16,
                                        borderRadius: "50%",
                                        background: isResolved ? "var(--status-emerald)" : "var(--accent-amber)",
                                        border: "2px solid var(--surface-card)",
                                        boxShadow: isResolved ? "0 0 8px rgba(16, 185, 129, 0.4)" : "0 0 8px rgba(245, 158, 11, 0.4)",
                                      }}
                                    />

                                    <div style={{ background: "var(--surface-2)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 12 }}>{rec.category}</span>
                                          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--status-cyan-bg)", color: "var(--status-cyan)", fontWeight: 700 }}>
                                            {rec.department}
                                          </span>
                                        </div>
                                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                                          {dateInfo.relative}
                                        </span>
                                      </div>

                                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{rec.description}</div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 10, color: "var(--text-muted)" }}>
                                        <span>📅 {dateInfo.full}</span>
                                        <span style={{ fontWeight: 800, color: isResolved ? "var(--status-emerald)" : "var(--accent-amber)" }}>
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
      {/* ADD EMPLOYEE MODAL */}
      {showCreateModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500, width: "100%", padding: "1.5rem", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#34d399" }}>
                ➕ Add New Employee
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marc Vance"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Role Position *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#38bdf8", fontSize: 13, fontWeight: 700 }}
                >
                  {STANDARD_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Department *</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e879f9", fontSize: 13, fontWeight: 700 }}
                >
                  {activeDepartments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+33 6 12 34 56 78"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "10px 16px", borderRadius: 8, background: "transparent", border: "1px solid #334155", color: "#cbd5e1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ padding: "10px 20px", borderRadius: 8, background: "#34d399", border: "none", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                >
                  Create Staff Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
